import type { ScenesRepositoryPort, SceneListFilters } from "@/src/scenes/domain/scene.repository"
import type { Scene } from "@/src/scenes/domain/scene.entity"

export async function listScenesUseCase(
  filters: SceneListFilters,
  repo: Pick<ScenesRepositoryPort, "list">,
): Promise<Scene[]> {
  return repo.list(filters)
}
