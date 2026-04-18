import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"

export async function deleteSceneUseCase(
  id: string,
  repo: ScenesRepositoryPort,
): Promise<boolean> {
  return repo.delete(id)
}
