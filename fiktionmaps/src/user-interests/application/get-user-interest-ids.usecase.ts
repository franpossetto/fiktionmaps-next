import type { UserInterestsRepositoryPort } from "@/src/user-interests/domain/user-interests.repository"

export async function getUserInterestIdsUseCase(
  userId: string,
  repo: UserInterestsRepositoryPort
): Promise<string[]> {
  return repo.getInterestIdsByUserId(userId)
}
