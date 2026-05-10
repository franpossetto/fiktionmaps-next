import { approveContributionUseCase } from "@/src/contributions/application/approve-contribution.usecase"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { CreateContributionInput } from "@/src/contributions/domain/contribution.schemas"

export async function createContributionUseCase(
  input: CreateContributionInput,
  repo: ContributionsRepositoryPort,
  autoApprove?: boolean,
): Promise<{ contributionId: string; autoApproved: boolean } | null> {
  const created = await repo.create(input)
  if (!created) return null

  if (!autoApprove) {
    return { contributionId: created.contributionId, autoApproved: false }
  }

  const approved = await approveContributionUseCase(
    { id: created.contributionId, moderatorId: input.userId },
    repo,
  )
  return { contributionId: created.contributionId, autoApproved: approved }
}
