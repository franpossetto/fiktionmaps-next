import type { ContributorModerationContext } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"

export async function getContributorModerationContextUseCase(
  userId: string,
  deps: { contributions: ContributionsRepositoryPort; users: UsersRepositoryPort },
): Promise<ContributorModerationContext> {
  const [totalContributions, profile] = await Promise.all([
    deps.contributions.countByUser(userId),
    deps.users.getProfile(userId),
  ])
  return {
    totalContributions,
    otherContributionsCount: Math.max(0, totalContributions - 1),
    fppTotal: profile?.fpp_total ?? 0,
  }
}
