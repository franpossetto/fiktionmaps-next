import type { FictionLikesRepositoryPort } from "@/src/fiction-likes/domain/fiction-likes.repository"

export async function setUserFictionLikesUseCase(
  userId: string,
  fictionIds: string[],
  repo: FictionLikesRepositoryPort
): Promise<void> {
  return repo.setForUser(userId, fictionIds)
}
