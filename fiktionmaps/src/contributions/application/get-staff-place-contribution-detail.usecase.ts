import type { PlaceContributionFeedItem } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getStaffPlaceContributionDetailUseCase(
  id: string,
  repo: ContributionsRepositoryPort,
): Promise<PlaceContributionFeedItem | null> {
  return repo.getPlaceCreateContributionWithContributorById(id)
}
