import type {
  FictionContributorProfile,
  FictionContributorRankedProfile,
  FictionContributorScopeEntry,
} from "@/src/contributions/domain/contribution.entity"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

function contributorSortKey(p: FictionContributorProfile): string {
  return (p.username?.trim() || p.fullName?.trim() || p.id).toLowerCase()
}

function aggregateFictionContributorScopeEntries(
  rows: FictionContributorScopeEntry[],
): FictionContributorRankedProfile[] {
  const byUserId = new Map<string, FictionContributorRankedProfile>()

  for (const row of rows) {
    const fpp = row.fppAwarded
    const existing = byUserId.get(row.id)
    if (existing) {
      existing.fppTotal += fpp
      continue
    }
    byUserId.set(row.id, {
      id: row.id,
      username: row.username,
      fullName: row.fullName,
      avatarUrl: row.avatarUrl,
      fppTotal: fpp,
    })
  }

  return [...byUserId.values()].sort((a, b) => {
    if (b.fppTotal !== a.fppTotal) {
      return b.fppTotal - a.fppTotal
    }
    return contributorSortKey(a).localeCompare(contributorSortKey(b), undefined, { sensitivity: "base" })
  })
}

export async function getFictionContributorsUseCase(
  fictionId: string,
  repo: ContributionsRepositoryPort,
): Promise<FictionContributorRankedProfile[]> {
  const rows = await repo.listApprovedContributorProfilesForFictionScope(fictionId)
  return aggregateFictionContributorScopeEntries(rows)
}

export function mergeFictionContributorRankedProfiles(
  lists: FictionContributorRankedProfile[][],
): FictionContributorRankedProfile[] {
  const rows: FictionContributorScopeEntry[] = lists.flatMap((list) =>
    list.map((contributor) => ({
      id: contributor.id,
      username: contributor.username,
      fullName: contributor.fullName,
      avatarUrl: contributor.avatarUrl,
      fppAwarded: contributor.fppTotal,
    })),
  )
  return aggregateFictionContributorScopeEntries(rows)
}
