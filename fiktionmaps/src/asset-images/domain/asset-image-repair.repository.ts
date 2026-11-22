import type { EntityType, ImageRole } from "@/lib/asset-images/image-variant-service"
import type { AssetImagesRepositoryPort } from "@/src/asset-images/domain/asset-image.repository"

export type UpsertAssetImageVariantInput = {
  entityType: EntityType
  entityId: string
  role: ImageRole
  variant: string
  url: string
  focusX: number
  focusY: number
}

export interface AssetImageRepairRepositoryPort extends AssetImagesRepositoryPort {
  downloadObject(path: string): Promise<{ data: Uint8Array | null; error: string | null }>
  uploadObject(
    path: string,
    data: Uint8Array,
    contentType: string,
  ): Promise<{ url: string | null; error: string | null }>
  upsertVariant(input: UpsertAssetImageVariantInput): Promise<string | null>
  removeObject(path: string): Promise<void>
}
