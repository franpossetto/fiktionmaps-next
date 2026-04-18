import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

interface GetCityFictionsDeps {
  placesRepo: {
    getFictionIdsByCityId(cityId: string): Promise<string[]>
  }
  fictionsRepo: FictionsRepositoryPort
}

export async function getCityFictionsUseCase(
  cityId: string,
  deps: GetCityFictionsDeps
): Promise<FictionWithMedia[]> {
  const fictionIds = await deps.placesRepo.getFictionIdsByCityId(cityId)
  if (fictionIds.length === 0) return []
  return deps.fictionsRepo.getByIds(fictionIds)
}
