import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { Place } from "@/src/places/domain/place.entity"

export async function listScenesInCityUseCase(
  fictionIds: string[],
  cityId: string,
  repo: ScenesRepositoryPort,
): Promise<Place[]> {
  return repo.listScenesWithVideoInCity({ fictionIds, cityId })
}
