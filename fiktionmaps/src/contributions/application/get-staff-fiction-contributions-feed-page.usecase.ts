import type {
  StaffFictionContributionsFeedPageInput,
  StaffFictionContributionsFeedPageResult,
} from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getStaffFictionContributionsFeedPageUseCase(
  input: StaffFictionContributionsFeedPageInput,
  repo: ContributionsRepositoryPort,
): Promise<StaffFictionContributionsFeedPageResult> {
  return repo.listFictionCreateContributionsStaffReviewFeedPage(input)
}
