import type { StaffCreateContributionFeedItem } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getStaffContributionDetailUseCase(
  id: string,
  repo: ContributionsRepositoryPort,
): Promise<StaffCreateContributionFeedItem | null> {
  return repo.getCreateContributionFeedItemById(id)
}
