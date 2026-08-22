import { createClient } from "@/lib/supabase/server"
import { encodeImageVariant } from "./encode-image-variant"
import {
  DEFAULT_IMAGE_FOCUS,
  normalizeImageFocus,
  type ImageFocus,
} from "./image-focus"
import {
  ASSET_IMAGES_BUCKET,
  THUMB_UPLOAD_VARIANTS,
  VARIANT_SIZES,
  type ImageVariant,
} from "./variant-sizes"
import type { ImageRole } from "./image-variant-service"
import type { ContributionEntityType } from "@/src/contributions/domain/contribution.entity"
import { ensureAssetImageXs } from "./ensure-xs-variant"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export type PendingContributionImageRole = Extract<ImageRole, "avatar" | "hero" | "cover" | "banner">

/** @deprecated Use PendingContributionImageRole */
export type PlaceContributionImageRole = Extract<PendingContributionImageRole, "avatar" | "hero">

function pendingBasePath(contributionId: string, role: PendingContributionImageRole): string {
  return `pending/contributions/${contributionId}/${role}`
}

function extensionFromStoragePath(path: string): string {
  const match = path.trim().toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? "avif"
}

export async function uploadPendingContributionImage(
  contributionId: string,
  role: PendingContributionImageRole,
  file: File | Buffer,
  variants: readonly ImageVariant[] = THUMB_UPLOAD_VARIANTS,
): Promise<
  | { success: true; paths: Partial<Record<ImageVariant, string>>; previewUrl: string }
  | { success: false; error: string }
> {
  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: "File too large (max 10 MB)" }
  }

  if (variants.length === 0) {
    return { success: false, error: "No variants requested" }
  }

  const supabase = await createClient()
  const basePath = pendingBasePath(contributionId, role)
  const version = Date.now()
  const paths: Partial<Record<ImageVariant, string>> = {}

  for (const variant of variants) {
    const encoded = await encodeImageVariant(buffer, variant, "avif")

    const storagePath =
      variant === "xs"
        ? `${basePath}/xs_${VARIANT_SIZES.xs}_${version}.${encoded.extension}`
        : `${basePath}/${variant}_${version}.${encoded.extension}`
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
    paths[variant] = storagePath
  }

  const lgPath = paths.lg ?? paths.sm ?? paths.xs
  if (!lgPath) {
    return { success: false, error: "Upload failed: missing preview variant" }
  }

  const { data: urlData } = supabase.storage.from(ASSET_IMAGES_BUCKET).getPublicUrl(lgPath)
  return { success: true, paths, previewUrl: urlData.publicUrl }
}

/** @deprecated Use uploadPendingContributionImage */
export const uploadPendingPlaceContributionImage = uploadPendingContributionImage

export async function removePendingContributionImagePaths(
  smPath: string | null | undefined,
  lgPath: string | null | undefined,
  xsPath?: string | null | undefined,
): Promise<void> {
  await removePendingContributionStoragePaths(
    [xsPath, smPath, lgPath].filter((p): p is string => Boolean(p?.trim())),
  )
}

export async function removePendingContributionStoragePaths(paths: string[]): Promise<void> {
  const toRemove = paths.filter((p): p is string => Boolean(p?.trim()))
  if (toRemove.length === 0) return
  const supabase = await createClient()
  await supabase.storage.from(ASSET_IMAGES_BUCKET).remove(toRemove)
}

export async function promotePendingContributionPhotoToAssetImages(
  entityType: Extract<ContributionEntityType, "place" | "fiction">,
  entityId: string,
  role: PendingContributionImageRole,
  paths: { xs?: string; sm?: string; lg?: string; xl?: string },
  focus: ImageFocus = DEFAULT_IMAGE_FOCUS,
): Promise<{ success: true } | { success: false; error: string }> {
  const pairs: { variant: ImageVariant; from: string }[] = []
  if (paths.xs?.trim()) pairs.push({ variant: "xs", from: paths.xs })
  if (paths.sm?.trim()) pairs.push({ variant: "sm", from: paths.sm })
  if (paths.lg?.trim()) pairs.push({ variant: "lg", from: paths.lg })
  if (paths.xl?.trim()) pairs.push({ variant: "xl", from: paths.xl })
  if (pairs.length === 0) {
    return { success: false, error: "No paths to promote" }
  }

  const normalizedFocus = normalizeImageFocus(focus.x, focus.y)
  const supabase = await createClient()
  const version = Date.now()

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
    for (const row of existing) {
      try {
        const pathMatch = row.url?.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
        if (pathMatch?.[1]) await supabase.storage.from(ASSET_IMAGES_BUCKET).remove([pathMatch[1]])
      } catch {
        // ignore
      }
    }
  }

  const inserts: {
    entity_type: string
    entity_id: string
    role: string
    variant: string
    url: string
    focus_x: number
    focus_y: number
  }[] = []

  for (const { variant, from } of pairs) {
    const ext = extensionFromStoragePath(from)
    const dest =
      variant === "xs"
        ? `${entityType}/${entityId}/${role}/xs_${VARIANT_SIZES.xs}_${version}.${ext}`
        : `${entityType}/${entityId}/${role}/${variant}_${version}.${ext}`
    const { error: copyErr } = await supabase.storage.from(ASSET_IMAGES_BUCKET).copy(from, dest)
    if (copyErr) {
      return { success: false, error: `Copy failed: ${copyErr.message}` }
    }
    const { data: urlData } = supabase.storage.from(ASSET_IMAGES_BUCKET).getPublicUrl(dest)
    inserts.push({
      entity_type: entityType,
      entity_id: entityId,
      role,
      variant,
      url: urlData.publicUrl,
      focus_x: normalizedFocus.x,
      focus_y: normalizedFocus.y,
    })
  }

  if (inserts.length) {
    const { error: insertError } = await supabase.from("asset_images").insert(inserts)
    if (insertError) {
      return { success: false, error: `Failed to save image records: ${insertError.message}` }
    }
  }

  await removePendingContributionStoragePaths(
    [paths.xs, paths.sm, paths.lg].filter((p): p is string => Boolean(p?.trim())),
  )

  // Legacy pending uploads may only have sm/lg — derive xs once on promote.
  if (!paths.xs?.trim() && (paths.sm?.trim() || paths.lg?.trim())) {
    await ensureAssetImageXs({ entityType, entityId, role })
  }

  return { success: true }
}

/** @deprecated Use promotePendingContributionPhotoToAssetImages */
export async function promotePendingPlacePhotoToAssetImages(
  placeId: string,
  role: PlaceContributionImageRole,
  smPath: string,
  lgPath: string,
): Promise<{ success: true } | { success: false; error: string }> {
  return promotePendingContributionPhotoToAssetImages("place", placeId, role, { sm: smPath, lg: lgPath })
}
