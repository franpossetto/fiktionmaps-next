import type { ContributorModerationContext } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getContributorModerationContextUseCase(
  userId: string,
  deps: { contributions: ContributionsRepositoryPort },
): Promise<ContributorModerationContext> {
  const [totalContributions, fppTotal] = await Promise.all([
    deps.contributions.countByUser(userId),
    deps.contributions.sumApprovedFppAwardedByUser(userId),
  ])
  return {
    totalContributions,
    otherContributionsCount: Math.max(0, totalContributions - 1),
    fppTotal,
  }
}
