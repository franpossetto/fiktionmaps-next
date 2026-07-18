/** Max width in pixels for each image variant (cover, avatar, banner). */
export const VARIANT_SIZES = {
  /** Chips + map pins (~20–64 CSS px at 2x/3x). */
  xs: 256,
  sm: 300,
  lg: 800,
  xl: 1200,
} as const

export type ImageVariant = keyof typeof VARIANT_SIZES

/** WebP quality per variant. */
export const VARIANT_WEBP_QUALITY: Record<ImageVariant, number> = {
  xs: 85,
  sm: 85,
  lg: 85,
  xl: 85,
}

/** Default set for cover / avatar style assets. */
export const THUMB_UPLOAD_VARIANTS = ["xs", "sm", "lg"] as const satisfies readonly ImageVariant[]

export const ASSET_IMAGES_BUCKET = "asset-images"

/** Prefer the smallest available URL for chip / list UI. */
export function pickAssetThumbUrl(urls: {
  xs?: string | null
  sm?: string | null
  lg?: string | null
}): string | null {
  const xs = urls.xs?.trim()
  if (xs) return xs
  const sm = urls.sm?.trim()
  if (sm) return sm
  const lg = urls.lg?.trim()
  if (lg) return lg
  return null
}
