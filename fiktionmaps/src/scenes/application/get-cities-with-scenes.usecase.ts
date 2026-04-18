import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { City } from "@/src/cities/domain/city.entity"

export async function getCitiesWithScenesUseCase(
  fictionIds: string[] | null,
  repo: ScenesRepositoryPort,
): Promise<City[]> {
  return repo.listCitiesWithActiveScenes(fictionIds)
}
