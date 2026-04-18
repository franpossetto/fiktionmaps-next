import type { UserInterestsRepositoryPort } from "@/src/user-interests/domain/user-interests.repository"

export async function setUserInterestsUseCase(
  userId: string,
  interestIds: string[],
  repo: UserInterestsRepositoryPort
): Promise<void> {
  return repo.setForUser(userId, interestIds)
}
