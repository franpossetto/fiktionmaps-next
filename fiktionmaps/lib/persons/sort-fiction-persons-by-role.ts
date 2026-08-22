import { FICTION_PERSON_ROLES, type FictionPerson, type FictionPersonRole } from "@/src/persons/domain/person.entity"

const ROLE_RANK = new Map<string, number>(FICTION_PERSON_ROLES.map((role, index) => [role, index]))

export type FictionPersonCreditGroup = {
  person_id: string
  name: string
  photo_url: string | null
  /** Roles in canonical order (unique). */
  roles: string[]
}

function roleRank(role: string): number {
  return ROLE_RANK.get(role) ?? Number.MAX_SAFE_INTEGER
}

/** Sort credits by role (canonical order), then sort_order, then name. */
export function sortFictionPersonsByRole(persons: FictionPerson[]): FictionPerson[] {
  return [...persons].sort((a, b) => {
    const rankA = roleRank(a.role)
    const rankB = roleRank(b.role)
    if (rankA !== rankB) return rankA - rankB
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.name.localeCompare(b.name)
  })
}

/**
 * One row per person: merge duplicate credit rows (same person, multiple roles)
 * into a single entry with roles listed in canonical order.
 */
export function groupFictionPersonsByPerson(persons: FictionPerson[]): FictionPersonCreditGroup[] {
  const byPerson = new Map<
    string,
    {
      person_id: string
      name: string
      photo_url: string | null
      roles: Set<string>
      bestRoleRank: number
      bestSortOrder: number
    }
  >()

  for (const credit of sortFictionPersonsByRole(persons)) {
    const existing = byPerson.get(credit.person_id)
    const rank = roleRank(credit.role)
    if (!existing) {
      byPerson.set(credit.person_id, {
        person_id: credit.person_id,
        name: credit.name,
        photo_url: credit.photo_url,
        roles: new Set([credit.role]),
        bestRoleRank: rank,
        bestSortOrder: credit.sort_order,
      })
      continue
    }
    existing.roles.add(credit.role)
    if (!existing.photo_url && credit.photo_url) {
      existing.photo_url = credit.photo_url
    }
    if (
      rank < existing.bestRoleRank ||
      (rank === existing.bestRoleRank && credit.sort_order < existing.bestSortOrder)
    ) {
      existing.bestRoleRank = rank
      existing.bestSortOrder = credit.sort_order
    }
  }

  return [...byPerson.values()]
    .sort((a, b) => {
      if (a.bestRoleRank !== b.bestRoleRank) return a.bestRoleRank - b.bestRoleRank
      if (a.bestSortOrder !== b.bestSortOrder) return a.bestSortOrder - b.bestSortOrder
      return a.name.localeCompare(b.name)
    })
    .map(({ person_id, name, photo_url, roles }) => ({
      person_id,
      name,
      photo_url,
      roles: [...roles].sort((a, b) => roleRank(a) - roleRank(b)),
    }))
}

export function isFictionPersonRole(role: string): role is FictionPersonRole {
  return ROLE_RANK.has(role)
}
