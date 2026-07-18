import type { FictionScopeContributorContributionItem } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getFictionScopeContributorContributionsUseCase(
  fictionId: string,
  userId: string,
  repo: ContributionsRepositoryPort,
): Promise<FictionScopeContributorContributionItem[]> {
  return repo.listApprovedContributionsForUserInFictionScope(fictionId, userId)
}
