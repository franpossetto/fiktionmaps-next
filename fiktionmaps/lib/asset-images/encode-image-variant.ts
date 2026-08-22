import sharp from "sharp"
import {
  VARIANT_AVIF_EFFORT,
  VARIANT_AVIF_QUALITY,
  VARIANT_SIZES,
  VARIANT_WEBP_QUALITY,
  type ImageCodec,
  type ImageVariant,
} from "./variant-sizes"

export type EncodeImageVariantOptions = {
  /** Override default quality for this encode. */
  quality?: number
  /** Override default AVIF effort (ignored for webp). */
  effort?: number
  /**
   * Max width override. `null` = no resize (keep source pixels).
   * Omit to use VARIANT_SIZES[variant].
   */
  maxWidth?: number | null
}

export type EncodedImageVariant = {
  buffer: Buffer
  contentType: string
  extension: ImageCodec
  width: number
  height: number
  quality: number
  /** AVIF effort used; null for WebP. */
  effort: number | null
}

/**
 * Resize + encode a single variant. Shared by upload and admin codec preview.
 */
export async function encodeImageVariant(
  buffer: Buffer,
  variant: ImageVariant,
  codec: ImageCodec,
  options?: EncodeImageVariantOptions,
): Promise<EncodedImageVariant> {
  const maxWidth =
    options && "maxWidth" in options ? options.maxWidth : VARIANT_SIZES[variant]

  let pipeline = sharp(buffer)
  if (maxWidth != null) {
    pipeline = pipeline.resize(maxWidth, null, { withoutEnlargement: true })
  }

  const quality =
    options?.quality ??
    (codec === "webp" ? VARIANT_WEBP_QUALITY[variant] : VARIANT_AVIF_QUALITY[variant])

  const effort = codec === "avif" ? (options?.effort ?? VARIANT_AVIF_EFFORT) : null

  const encoded =
    codec === "webp"
      ? pipeline.webp({ quality })
      : pipeline.avif({
          quality,
          effort: effort ?? VARIANT_AVIF_EFFORT,
        })

  const { data, info } = await encoded.toBuffer({ resolveWithObject: true })

  return {
    buffer: data,
    contentType: codec === "webp" ? "image/webp" : "image/avif",
    extension: codec,
    width: info.width,
    height: info.height,
    quality,
    effort,
  }
}
