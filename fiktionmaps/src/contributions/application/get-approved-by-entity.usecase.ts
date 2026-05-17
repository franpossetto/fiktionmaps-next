import type { Contribution, ContributionEntityType } from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getApprovedByEntityUseCase(
  entityType: ContributionEntityType,
  entityId: string,
  repo: ContributionsRepositoryPort,
): Promise<Contribution[]> {
  return repo.getApprovedByEntity(entityType, entityId)
}
