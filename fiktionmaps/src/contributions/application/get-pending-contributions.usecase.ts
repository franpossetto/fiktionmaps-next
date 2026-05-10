import type { Contribution } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getPendingContributionsUseCase(
  repo: ContributionsRepositoryPort,
): Promise<Contribution[]> {
  return repo.getPending()
}
