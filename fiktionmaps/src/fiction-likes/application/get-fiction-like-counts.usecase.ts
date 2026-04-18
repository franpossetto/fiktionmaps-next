import type { FictionLikesRepositoryPort } from "@/src/fiction-likes/domain/fiction-likes.repository"

export async function getFictionLikeCountsUseCase(
  fictionIds: string[],
  repo: FictionLikesRepositoryPort
): Promise<Record<string, number>> {
  if (fictionIds.length === 0) return {}
  return repo.countByIds(fictionIds)
}
