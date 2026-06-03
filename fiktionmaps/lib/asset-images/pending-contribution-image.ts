import sharp from "sharp"
import { createClient } from "@/lib/supabase/server"
import { ASSET_IMAGES_BUCKET, VARIANT_SIZES, type ImageVariant } from "./variant-sizes"
import type { ImageRole } from "./image-variant-service"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export type PlaceContributionImageRole = Extract<ImageRole, "avatar" | "hero">

function pendingBasePath(contributionId: string, role: PlaceContributionImageRole): string {
  return `pending/contributions/${contributionId}/${role}`
}

export async function uploadPendingPlaceContributionImage(
  contributionId: string,
  role: PlaceContributionImageRole,
  file: File | Buffer,
): Promise<
  | { success: true; smPath: string; lgPath: string; previewUrl: string }
  | { success: false; error: string }
> {
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: "File too large (max 10 MB)" }
  }

  const supabase = await createClient()
  const basePath = pendingBasePath(contributionId, role)
  const version = Date.now()
  const paths: Partial<Record<ImageVariant, string>> = {}

  for (const variant of ["sm", "lg"] as const) {
    const width = VARIANT_SIZES[variant]
    const webpBuffer = await sharp(buffer)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()

    const storagePath = `${basePath}/${variant}_${version}.webp`
    const { error: uploadError } = await supabase.storage
      .from(ASSET_IMAGES_BUCKET)
      .upload(storagePath, webpBuffer, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "31536000",
      })

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }
    paths[variant] = storagePath
  }

  const lgPath = paths.lg
  const smPath = paths.sm
  if (!lgPath || !smPath) {
    return { success: false, error: "Upload failed: missing variants" }
  }

  const { data: urlData } = supabase.storage.from(ASSET_IMAGES_BUCKET).getPublicUrl(lgPath)
  return { success: true, smPath, lgPath, previewUrl: urlData.publicUrl }
}

export async function removePendingContributionImagePaths(
  smPath: string | null | undefined,
  lgPath: string | null | undefined,
): Promise<void> {
  await removePendingContributionStoragePaths(
    [smPath, lgPath].filter((p): p is string => Boolean(p?.trim())),
  )
}

export async function removePendingContributionStoragePaths(paths: string[]): Promise<void> {
  const toRemove = paths.filter((p): p is string => Boolean(p?.trim()))
  if (toRemove.length === 0) return
  const supabase = await createClient()
  await supabase.storage.from(ASSET_IMAGES_BUCKET).remove(toRemove)
}

export async function promotePendingPlacePhotoToAssetImages(
  placeId: string,
  role: PlaceContributionImageRole,
  smPath: string,
  lgPath: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const version = Date.now()

  const { data: existing } = await supabase
    .from("asset_images")
    .select("id, url")
    .eq("entity_type", "place")
    .eq("entity_id", placeId)
    .eq("role", role)

  if (existing?.length) {
    await supabase
      .from("asset_images")
      .delete()
      .eq("entity_type", "place")
      .eq("entity_id", placeId)
      .eq("role", role)
    for (const row of existing) {
      try {
        const pathMatch = row.url?.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
        if (pathMatch?.[1]) await supabase.storage.from(ASSET_IMAGES_BUCKET).remove([pathMatch[1]])
      } catch {
        // ignore
      }
    }
  }

  const inserts: { entity_type: string; entity_id: string; role: string; variant: string; url: string }[] = []
  const pairs: { variant: ImageVariant; from: string }[] = [
    { variant: "sm", from: smPath },
    { variant: "lg", from: lgPath },
  ]

  for (const { variant, from } of pairs) {
    const dest = `place/${placeId}/${role}/${variant}_${version}.webp`
    const { error: copyErr } = await supabase.storage.from(ASSET_IMAGES_BUCKET).copy(from, dest)
    if (copyErr) {
      return { success: false, error: `Copy failed: ${copyErr.message}` }
    }
    const { data: urlData } = supabase.storage.from(ASSET_IMAGES_BUCKET).getPublicUrl(dest)
    inserts.push({
      entity_type: "place",
      entity_id: placeId,
      role,
      variant,
      url: urlData.publicUrl,
    })
  }

  if (inserts.length) {
    const { error: insertError } = await supabase.from("asset_images").insert(inserts)
    if (insertError) {
      return { success: false, error: `Failed to save image records: ${insertError.message}` }
    }
  }

  await removePendingContributionImagePaths(smPath, lgPath)
  return { success: true }
}
