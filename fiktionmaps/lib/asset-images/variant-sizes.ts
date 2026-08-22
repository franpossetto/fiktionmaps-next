/** Max width in pixels for each image variant (cover, avatar, banner). */
export const VARIANT_SIZES = {
  /** Map pins (~20–64 CSS px at 2x/3x). */
  xs: 256,
  /** Lists / compact UI. */
  sm: 300,
  /** Map side panel hero. */
  lg: 800,
  /** Fiction / place detail pages. */
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
 * Calibrated at 60 for all sizes (lab: detail vs size).
 */
export const VARIANT_AVIF_QUALITY: Record<ImageVariant, number> = {
  xs: 60,
  sm: 60,
  lg: 60,
  xl: 60,
}

/** sharp AVIF encode effort (0–9). Higher = slower + often smaller. */
export const VARIANT_AVIF_EFFORT = 9

export type ImageCodec = "webp" | "avif"

/** Default set for cover / place avatar assets (pins → page). */
export const THUMB_UPLOAD_VARIANTS = ["xs", "sm", "lg", "xl"] as const satisfies readonly ImageVariant[]

/**
 * Person headshots (credits list → admin card).
 * Uses the existing ladder (no `md`); four sizes: xs / sm / lg / xl.
 */
export const PERSON_AVATAR_UPLOAD_VARIANTS = ["xs", "sm", "lg", "xl"] as const satisfies readonly ImageVariant[]

/** Wide fiction hero / banner (map panel lg + page xl). */
export const BANNER_UPLOAD_VARIANTS = ["lg", "xl"] as const satisfies readonly ImageVariant[]

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
