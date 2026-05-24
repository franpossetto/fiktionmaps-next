import type { FictionWithMediaAndCatalogIds } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { FictionExternalIdsRepositoryPort } from "@/src/fiction-external-ids/domain/fiction-external-ids.repository"

export async function getFictionWithCatalogExternalIdsForStaffUseCase(
  id: string,
  fictionsRepo: FictionsRepositoryPort,
  externalIdsRepo: FictionExternalIdsRepositoryPort,
): Promise<FictionWithMediaAndCatalogIds | null> {
  const fiction = await fictionsRepo.getById(id)
  if (!fiction) return null
  const rows = await externalIdsRepo.listForFiction(id)
  const catalogExternalIds: FictionWithMediaAndCatalogIds["catalogExternalIds"] = {}
  for (const row of rows) {
    catalogExternalIds[row.provider] = row.externalId
  }
  return { ...fiction, catalogExternalIds }
}
