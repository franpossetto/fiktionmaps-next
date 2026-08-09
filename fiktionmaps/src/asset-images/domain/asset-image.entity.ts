import type { AssetImageFormat } from "@/lib/asset-images/detect-asset-image-format"
import type { ImageVariant } from "@/lib/asset-images/variant-sizes"

export type AssetVariantFormatStatus = {
  variant: ImageVariant
  /** Present in storage/DB. */
  present: boolean
  format: AssetImageFormat
  /** Present and AVIF — ready to skip for that variant. */
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
