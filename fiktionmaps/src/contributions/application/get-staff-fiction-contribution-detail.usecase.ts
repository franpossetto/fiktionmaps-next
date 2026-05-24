import type { FictionContributionFeedItem } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getStaffFictionContributionDetailUseCase(
  id: string,
  repo: ContributionsRepositoryPort,
): Promise<FictionContributionFeedItem | null> {
  return repo.getFictionCreateContributionWithContributorById(id)
}
