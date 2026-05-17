import type { FictionPersonRole } from "@/src/persons/domain/person.entity"
import type { Person } from "@/src/persons/domain/person.entity"
import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"

export interface ListCreditCandidatesForContributeDTO {
  role: FictionPersonRole
  nameQuery: string
}

export async function listCreditCandidatesForContribute(
  dto: ListCreditCandidatesForContributeDTO,
  repo: PersonsRepositoryPort,
): Promise<Person[]> {
  const q = dto.nameQuery.trim()
  return repo.listPersonsWithFictionRole(dto.role, q.length > 0 ? q : null, 60)
}
