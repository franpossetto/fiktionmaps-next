import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { Location } from "@/src/locations/domain/location.entity"

export async function listScenesInCityUseCase(
  fictionIds: string[],
  cityId: string,
  repo: ScenesRepositoryPort,
): Promise<Location[]> {
  return repo.listScenesWithVideoInCity({ fictionIds, cityId })
}
