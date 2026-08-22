import { createClient } from "@/lib/supabase/server"
import { encodeImageVariant } from "./encode-image-variant"
import {
  DEFAULT_IMAGE_FOCUS,
  normalizeImageFocus,
  type ImageFocus,
} from "./image-focus"
import {
  ASSET_IMAGES_BUCKET,
  VARIANT_SIZES,
  type ImageCodec,
  type ImageVariant,
} from "./variant-sizes"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export type EntityType = "fiction" | "city" | "location" | "scene" | "profile" | "place" | "person"
export type ImageRole = "cover" | "banner" | "avatar" | "hero"

export interface UploadImageOptions {
  entityType: EntityType
  entityId: string
  role: ImageRole
  /** Variants to generate (e.g. ['sm', 'lg'] for cover; ['lg'] for banner). */
  variants: readonly ImageVariant[]
  file: File | Buffer
  /** Optional: remove existing rows for this (entity_type, entity_id, role) before inserting. */
  replace?: boolean
  /** Focal point for object-position (0–100). Defaults to center. */
  focus?: ImageFocus
  /** Output codec. Defaults to webp (e.g. profile); fiction/place/contributions use avif. */
  codec?: ImageCodec
}

/**
 * Generates image variants, uploads to Supabase Storage, and upserts asset_images rows.
 * Call from a Server Action with the user's uploaded file.
 */
export async function uploadEntityImage(options: UploadImageOptions): Promise<
  | { success: true; urls: Record<ImageVariant, string> }
  | { success: false; error: string }
> {
  const {
    entityType,
    entityId,
    role,
    variants,
    file,
    replace = true,
    codec = "webp",
  } = options
  const focus = normalizeImageFocus(
    options.focus?.x ?? DEFAULT_IMAGE_FOCUS.x,
    options.focus?.y ?? DEFAULT_IMAGE_FOCUS.y,
  )

  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: "File too large (max 10 MB)" }
  }

  const supabase = await createClient()
  const basePath = `${entityType}/${entityId}/${role}`

  if (replace) {
    const { data: existing } = await supabase
      .from("asset_images")
      .select("id, url")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("role", role)
    if (existing?.length) {
      await supabase
        .from("asset_images")
        .delete()
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("role", role)
      // Optionally delete old objects from storage (paths derived from url or stored path)
      for (const row of existing) {
        try {
          const pathMatch = row.url?.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
          if (pathMatch?.[1]) await supabase.storage.from(ASSET_IMAGES_BUCKET).remove([pathMatch[1]])
        } catch {
          // ignore
        }
      }
    }
  }

  const urls: Partial<Record<ImageVariant, string>> = {}
  const inserts: {
    entity_type: string
    entity_id: string
    role: string
    variant: string
    url: string
    focus_x: number
    focus_y: number
  }[] = []
  const version = Date.now()

  for (const variant of variants) {
    const encoded = await encodeImageVariant(buffer, variant, codec)

    const fileName =
      variant === "xs"
        ? `xs_${VARIANT_SIZES.xs}_${version}.${encoded.extension}`
        : `${variant}_${version}.${encoded.extension}`
    const storagePath = `${basePath}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(ASSET_IMAGES_BUCKET)
      .upload(storagePath, encoded.buffer, {
        contentType: encoded.contentType,
        upsert: true,
        cacheControl: "31536000",
      })

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    const { data: urlData } = supabase.storage.from(ASSET_IMAGES_BUCKET).getPublicUrl(storagePath)
    const url = urlData.publicUrl
    urls[variant] = url
    inserts.push({
      entity_type: entityType,
      entity_id: entityId,
      role,
      variant,
      url,
      focus_x: focus.x,
      focus_y: focus.y,
    })
  }

  if (inserts.length) {
    const { error: insertError } = await supabase.from("asset_images").insert(inserts)
    if (insertError) {
      return { success: false, error: `Failed to save image records: ${insertError.message}` }
    }
  }

  return { success: true, urls: urls as Record<ImageVariant, string> }
}

/**
 * Validate file type and size for image upload (use before calling uploadEntityImage).
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Use JPEG, PNG, WebP or GIF."
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File too large (max 10 MB)."
  }
  return null
}
