import type { FictionLikesRepositoryPort } from "@/src/fiction-likes/domain/fiction-likes.repository"

export async function getUserFictionLikesUseCase(
  userId: string,
  repo: FictionLikesRepositoryPort
): Promise<string[]> {
  return repo.getLikedFictionIdsByUserId(userId)
}
