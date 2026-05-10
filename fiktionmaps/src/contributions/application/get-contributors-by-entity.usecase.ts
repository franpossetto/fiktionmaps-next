import type {
  ContributionEntityType,
  FictionContributorProfile,
} from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

function contributorSortKey(p: FictionContributorProfile): string {
  return (p.username?.trim() || p.id).toLowerCase()
}

export async function getContributorsByEntityUseCase(
  entityType: ContributionEntityType,
  entityId: string,
  repo: ContributionsRepositoryPort,
): Promise<FictionContributorProfile[]> {
  const rows = await repo.listApprovedProfilesForEntity(entityType, entityId)
  const byUserId = new Map<string, FictionContributorProfile>()
  for (const p of rows) {
    if (!byUserId.has(p.id)) byUserId.set(p.id, p)
  }
  return [...byUserId.values()].sort((a, b) =>
    contributorSortKey(a).localeCompare(contributorSortKey(b), undefined, { sensitivity: "base" }),
  )
}
