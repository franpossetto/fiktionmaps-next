import type { FictionInterestsRepositoryPort } from "@/src/fiction-interests/domain/fiction-interests.repository"

export async function setFictionInterestsUseCase(
  fictionId: string,
  interestIds: string[],
  repo: FictionInterestsRepositoryPort
): Promise<void> {
  return repo.setForFiction(fictionId, interestIds)
}
