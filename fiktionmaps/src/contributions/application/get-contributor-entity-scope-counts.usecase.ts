import type { ContributorEntityScopeCounts } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getContributorEntityScopeCountsUseCase(
  userId: string,
  repo: ContributionsRepositoryPort,
): Promise<ContributorEntityScopeCounts> {
  return repo.countApprovedFictionAndPlaceScopesByUser(userId)
}
