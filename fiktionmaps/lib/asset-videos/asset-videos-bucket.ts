/** Supabase Storage bucket for scene video clips (see migration 023). */
export const ASSET_VIDEOS_BUCKET = "asset-videos"

/**
 * Extract storage object path from a public URL for our project + bucket, for delete.
 * Mirrors the pattern in lib/asset-images/image-variant-service.ts for asset-images.
 */
export function tryParseStoragePathFromVideoUrl(
  publicUrl: string | null | undefined,
  bucketId: string = ASSET_VIDEOS_BUCKET
): string | null {
  if (!publicUrl?.trim()) return null
  const escaped = bucketId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`/storage/v1/object/public/${escaped}/(.+)$`)
  const m = publicUrl.match(re)
  return m?.[1] ? decodeURIComponent(m[1]) : null
}
