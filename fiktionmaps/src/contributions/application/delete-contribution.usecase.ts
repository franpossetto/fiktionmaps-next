import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function deleteContributionUseCase(
  id: string,
  repo: ContributionsRepositoryPort,
): Promise<boolean> {
  const result = await repo.deletePendingOrRejected(id)
  return result?.deleted === true
}
