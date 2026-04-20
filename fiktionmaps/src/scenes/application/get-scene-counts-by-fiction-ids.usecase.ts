import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"

export async function getSceneCountsByFictionIdsUseCase(
  fictionIds: string[],
  repo: ScenesRepositoryPort,
): Promise<Record<string, number>> {
  if (fictionIds.length === 0) return {}
  return repo.countByFictionIds(fictionIds)
}
