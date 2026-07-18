import sharp from "sharp"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { EntityType, ImageRole } from "./image-variant-service"
import {
  ASSET_IMAGES_BUCKET,
  VARIANT_SIZES,
  VARIANT_WEBP_QUALITY,
} from "./variant-sizes"

function storagePathFromPublicUrl(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

async function getWriteClient(): Promise<
  | { ok: true; client: SupabaseClient<Database> }
  | { ok: false; error: string }
> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    try {
      return { ok: true, client: createServiceClient() }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Service client unavailable",
      }
    }
  }

  // Fallback: authenticated session (RLS allows authenticated insert/upload).
  const sessionClient = await createClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()
  if (!user) {
    return {
      ok: false,
      error:
        "Cannot write xs variant: set SUPABASE_SERVICE_ROLE_KEY, or sign in (anon cannot insert asset_images).",
    }
  }
  return { ok: true, client: sessionClient }
}

/** Filenames: `xs_256_<ts>.webp` — older `xs_<ts>.webp` are treated as stale. */
function isCurrentXsGeneration(url: string): boolean {
  return url.includes(`/xs_${VARIANT_SIZES.xs}_`)
}

/**
 * Returns existing xs URL, or generates it from sm (fallback lg) and persists it.
 * Regenerates when an older xs is narrower than the current target size.
 */
export async function ensureAssetImageXs(options: {
  entityType: EntityType
  entityId: string
  role: ImageRole
}): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const { entityType, entityId, role } = options
  const readClient = createAnonymousClient()

  const { data: existingXs } = await readClient
    .from("asset_images")
    .select("url")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("role", role)
    .eq("variant", "xs")
    .maybeSingle()

  const xsUrl = existingXs?.url?.trim()
  if (xsUrl && isCurrentXsGeneration(xsUrl)) {
    return { success: true, url: xsUrl }
  }

  const { data: sourceRows } = await readClient
    .from("asset_images")
    .select("variant, url")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("role", role)
    .in("variant", ["sm", "lg"])

  const rows = (sourceRows ?? []) as { variant: string; url: string }[]
  const sm = rows.find((r) => r.variant === "sm")?.url?.trim()
  const lg = rows.find((r) => r.variant === "lg")?.url?.trim()
  const sourceUrl = sm || lg
  if (!sourceUrl) {
    return { success: false, error: "No source variant (sm/lg) to derive xs" }
  }

  const sourcePath = storagePathFromPublicUrl(sourceUrl)
  if (!sourcePath) {
    return { success: false, error: "Could not resolve source storage path" }
  }

  const { data: blob, error: downloadError } = await readClient.storage
    .from(ASSET_IMAGES_BUCKET)
    .download(sourcePath)

  if (downloadError || !blob) {
    return { success: false, error: downloadError?.message ?? "Failed to download source image" }
  }

  const write = await getWriteClient()
  if (!write.ok) return { success: false, error: write.error }
  const writeClient = write.client

  const sourceBuffer = Buffer.from(await blob.arrayBuffer())
  const webpBuffer = await sharp(sourceBuffer)
    .resize(VARIANT_SIZES.xs, null, { withoutEnlargement: true, fit: "inside" })
    .webp({ quality: VARIANT_WEBP_QUALITY.xs })
    .toBuffer()

  const version = Date.now()
  const storagePath = `${entityType}/${entityId}/${role}/xs_${VARIANT_SIZES.xs}_${version}.webp`

  const { error: uploadError } = await writeClient.storage
    .from(ASSET_IMAGES_BUCKET)
    .upload(storagePath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000",
    })

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  const { data: urlData } = writeClient.storage.from(ASSET_IMAGES_BUCKET).getPublicUrl(storagePath)
  const url = urlData.publicUrl

  const { error: insertError } = await writeClient.from("asset_images").upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      role,
      variant: "xs",
      url,
    },
    { onConflict: "entity_type,entity_id,role,variant" },
  )

  if (insertError) {
    return { success: false, error: `Failed to save xs record: ${insertError.message}` }
  }

  // Best-effort cleanup of the undersized previous object.
  if (xsUrl) {
    const oldPath = storagePathFromPublicUrl(xsUrl)
    if (oldPath && oldPath !== storagePath) {
      await writeClient.storage.from(ASSET_IMAGES_BUCKET).remove([oldPath]).catch(() => undefined)
    }
  }

  return { success: true, url }
}
