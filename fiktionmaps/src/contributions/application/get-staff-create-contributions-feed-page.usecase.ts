import type {
  StaffCreateContributionsFeedPageInput,
  StaffCreateContributionsFeedPageResult,
} from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getStaffCreateContributionsFeedPageUseCase(
  input: StaffCreateContributionsFeedPageInput,
  repo: ContributionsRepositoryPort,
): Promise<StaffCreateContributionsFeedPageResult> {
  return repo.listCreateContributionsStaffReviewFeedPage(input)
}
