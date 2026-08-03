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
}

export type EncodedImageVariant = {
  buffer: Buffer
  contentType: string
  extension: ImageCodec
  width: number
  height: number
  quality: number
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
  const width = VARIANT_SIZES[variant]
  const pipeline = sharp(buffer).resize(width, null, { withoutEnlargement: true })

  const quality =
    options?.quality ??
    (codec === "webp" ? VARIANT_WEBP_QUALITY[variant] : VARIANT_AVIF_QUALITY[variant])

  const encoded =
    codec === "webp"
      ? pipeline.webp({ quality })
      : pipeline.avif({
          quality,
          effort: options?.effort ?? VARIANT_AVIF_EFFORT,
        })

  const { data, info } = await encoded.toBuffer({ resolveWithObject: true })

  return {
    buffer: data,
    contentType: codec === "webp" ? "image/webp" : "image/avif",
    extension: codec,
    width: info.width,
    height: info.height,
    quality,
  }
}
