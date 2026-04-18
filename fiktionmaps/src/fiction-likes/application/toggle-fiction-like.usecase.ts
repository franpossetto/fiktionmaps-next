import type { FictionLikesRepositoryPort } from "@/src/fiction-likes/domain/fiction-likes.repository"

export async function toggleFictionLikeUseCase(
  userId: string,
  fictionId: string,
  repo: FictionLikesRepositoryPort
): Promise<{ liked: boolean; likeCount: number }> {
  return repo.toggle(userId, fictionId)
}
