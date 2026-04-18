import type { FictionInterestsRepositoryPort } from "@/src/fiction-interests/domain/fiction-interests.repository"

export async function getFictionInterestsUseCase(
  fictionId: string,
  repo: FictionInterestsRepositoryPort
): Promise<string[]> {
  return repo.getInterestIdsByFictionId(fictionId)
}
