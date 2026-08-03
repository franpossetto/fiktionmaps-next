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

/**
 * AVIF quality per variant (sharp 0–100; not 1:1 with WebP).
 * Calibrated at 48 for all sizes.
 */
export const VARIANT_AVIF_QUALITY: Record<ImageVariant, number> = {
  xs: 48,
  sm: 48,
  lg: 48,
  xl: 48,
}

/** sharp AVIF encode effort (0–9). Higher = slower + often smaller. */
export const VARIANT_AVIF_EFFORT = 6

export type ImageCodec = "webp" | "avif"

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
