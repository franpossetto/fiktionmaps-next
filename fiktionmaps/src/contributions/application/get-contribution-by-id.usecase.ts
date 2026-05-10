import type { Contribution } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getContributionByIdUseCase(
  id: string,
  repo: ContributionsRepositoryPort,
): Promise<Contribution | null> {
  return repo.getById(id)
}
