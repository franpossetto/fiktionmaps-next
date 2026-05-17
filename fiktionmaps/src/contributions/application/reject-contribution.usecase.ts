import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { RejectContributionInput } from "@/src/contributions/domain/contribution.schemas"

export async function rejectContributionUseCase(
  input: RejectContributionInput,
  repo: ContributionsRepositoryPort,
): Promise<boolean> {
  return repo.reject(input)
}
