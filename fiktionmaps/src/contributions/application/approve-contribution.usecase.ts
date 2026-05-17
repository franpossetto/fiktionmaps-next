import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { ApproveContributionInput } from "@/src/contributions/domain/contribution.schemas"

export async function approveContributionUseCase(
  input: ApproveContributionInput,
  repo: ContributionsRepositoryPort,
): Promise<boolean> {
  return repo.approve(input)
}
