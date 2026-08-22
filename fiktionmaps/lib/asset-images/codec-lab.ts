import {
  VARIANT_AVIF_EFFORT,
  VARIANT_AVIF_QUALITY,
  VARIANT_SIZES,
  VARIANT_WEBP_QUALITY,
  type ImageVariant,
} from "./variant-sizes"

/** Lab sizes: production variants + full source pixels (no resize). */
export type CodecLabSize = ImageVariant | "src"

export const CODEC_LAB_SIZES = ["src", "xs", "sm", "lg", "xl"] as const satisfies readonly CodecLabSize[]

export const CODEC_LAB_SIZE_HINT: Record<CodecLabSize, string> = {
  src: "same px as original",
  xs: "pins",
  sm: "lists",
  lg: "map panel",
  xl: "page",
}

/** @deprecated use CODEC_LAB_SIZES */
export const CODEC_LAB_VARIANTS = ["xs", "sm", "lg", "xl"] as const satisfies readonly ImageVariant[]

/** @deprecated use CODEC_LAB_SIZE_HINT */
export const CODEC_LAB_VARIANT_HINT = CODEC_LAB_SIZE_HINT

export function codecLabMaxWidth(
  size: CodecLabSize,
  originalWidth?: number | null,
): number | null {
  if (size === "src") return originalWidth ?? null
  return VARIANT_SIZES[size]
}

/** Handy reference for UI copy / reset targets. */
export const CODEC_LAB_CURRENT_DEFAULTS = {
  avifQuality: VARIANT_AVIF_QUALITY.lg,
  avifEffort: VARIANT_AVIF_EFFORT,
  webpQuality: VARIANT_WEBP_QUALITY.lg,
} as const
