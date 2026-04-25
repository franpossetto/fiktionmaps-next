import type { Person } from "@/src/persons/domain/person.entity"
import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"

export interface SearchPersonsDTO {
  query: string
}

export async function searchPersons(
  dto: SearchPersonsDTO,
  repo: PersonsRepositoryPort
): Promise<Person[]> {
  return repo.search(dto.query)
}
