import type {
  ContributorProfileWithDate,
  ContributionEntityType,
} from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export async function getContributorsFirstContributionByEntityUseCase(
  entityType: ContributionEntityType,
  entityId: string,
  repo: ContributionsRepositoryPort,
): Promise<ContributorProfileWithDate[]> {
  return repo.listApprovedContributorProfilesFirstContributionAt(entityType, entityId)
}
