import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { Scene } from "@/src/scenes/domain/scene.entity"

export async function getSceneByIdUseCase(
  id: string,
  repo: ScenesRepositoryPort,
): Promise<Scene | null> {
  return repo.getById(id)
}
