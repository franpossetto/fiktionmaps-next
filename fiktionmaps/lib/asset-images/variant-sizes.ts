/** Max width in pixels for each image variant (cover and banner). */
export const VARIANT_SIZES = {
  sm: 300,
  lg: 800,
  xl: 1200,
} as const

export type ImageVariant = keyof typeof VARIANT_SIZES

export const ASSET_IMAGES_BUCKET = "asset-images"
