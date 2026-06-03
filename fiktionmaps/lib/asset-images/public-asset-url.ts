import { ASSET_IMAGES_BUCKET } from "./variant-sizes"

/** Public URL for a path inside the asset-images bucket. */
export function publicAssetImageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? ""
  const path = storagePath.replace(/^\//, "")
  return `${base}/storage/v1/object/public/${ASSET_IMAGES_BUCKET}/${path}`
}
