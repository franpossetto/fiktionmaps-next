import type { ScenesRepositoryPort, SceneListFilters } from "@/src/scenes/domain/scene.repository"
import type { Scene } from "@/src/scenes/domain/scene.entity"

export async function listScenesUseCase(
  filters: SceneListFilters,
  repo: ScenesRepositoryPort,
): Promise<Scene[]> {
  return repo.list(filters)
}
