import type { ProfileContributionItem } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getProfileContributionsByUserUseCase(
  userId: string,
  repo: ContributionsRepositoryPort,
): Promise<ProfileContributionItem[]> {
  return repo.listProfileContributionsByUser(userId)
}
