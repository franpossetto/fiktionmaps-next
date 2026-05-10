import type { TopContributorProfile } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getTopContributorsUseCase(
  limit: number,
  repo: ContributionsRepositoryPort,
): Promise<TopContributorProfile[]> {
  return repo.listTopContributors(limit)
}
