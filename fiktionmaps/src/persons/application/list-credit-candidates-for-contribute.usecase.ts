import type { FictionPersonRole } from "@/src/persons/domain/person.entity"
import type { Person } from "@/src/persons/domain/person.entity"
import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"

export interface ListCreditCandidatesForContributeDTO {
  /** Kept for callers; listing uses the full persons catalog (not role-filtered). */
  role: FictionPersonRole
  nameQuery: string
}

/**
 * Candidates for fiction credit during contribute: search the persons catalog.
 * Avoids requiring the person to already be linked as director/author on another fiction.
 */
export async function listCreditCandidatesForContribute(
  dto: ListCreditCandidatesForContributeDTO,
  repo: PersonsRepositoryPort,
): Promise<Person[]> {
  const q = dto.nameQuery.trim()
  if (!q) return []
  return repo.search(q)
}
