export type AssetImageVariantRow = {
  variant: string
  url: string
}

export interface AssetImagesRepositoryPort {
  listByEntityRole(
    entityType: string,
    entityId: string,
    role: string,
  ): Promise<AssetImageVariantRow[]>
}
