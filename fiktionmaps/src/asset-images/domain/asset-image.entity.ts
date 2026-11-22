import type { AssetImageFormat } from "@/lib/asset-images/detect-asset-image-format"
import type { ImageVariant } from "@/lib/asset-images/variant-sizes"

export type AssetVariantFormatStatus = {
  variant: ImageVariant
  /** Row exists in `asset_images`. */
  hasRow: boolean
  /** Public object exists (HEAD/GET 2xx). */
  present: boolean
  /**
   * `asset_images` has a URL but the public object is gone (404/400).
   * Repair target: regenerate from sm/lg or re-upload.
   */
  objectMissing: boolean
  /** The public URL could not be checked; do not assume it is missing. */
  probeFailed: boolean
  format: AssetImageFormat
  /** Object exists and is AVIF — ready to skip for that variant. */
  ok: boolean
  url: string | null
  /** Object byte size when known (Content-Length). */
  byteLength: number | null
}

export type AssetRoleFormatInventory = {
  entityType: string
  entityId: string
  role: string
  variants: AssetVariantFormatStatus[]
  /** Every expected variant is present as AVIF. */
  allAvifOk: boolean
}
