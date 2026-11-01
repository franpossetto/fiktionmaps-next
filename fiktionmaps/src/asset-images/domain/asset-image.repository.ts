export type AssetImageVariantRow = {
  variant: string
  url: string
  focusX?: number | null
  focusY?: number | null
}

export interface AssetImagesRepositoryPort {
  listByEntityRole(
    entityType: string,
    entityId: string,
    role: string,
  ): Promise<AssetImageVariantRow[]>
}
