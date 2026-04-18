import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

export async function getCityFictionsWithScenesUseCase(
  cityId: string,
  deps: {
    listFictionIdsWithScenesInCity: (cityId: string) => Promise<string[]>
    getFictionsByIds: (ids: string[]) => Promise<FictionWithMedia[]>
  }
): Promise<FictionWithMedia[]> {
  const ids = await deps.listFictionIdsWithScenesInCity(cityId)
  if (ids.length === 0) return []
  const fics = await deps.getFictionsByIds(ids)
  return fics.sort((a, b) => a.title.localeCompare(b.title))
}
