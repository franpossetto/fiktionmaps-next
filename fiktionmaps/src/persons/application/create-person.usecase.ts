import type { Person } from "@/src/persons/domain/person.entity"
import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"
import type { CreatePersonData } from "@/src/persons/domain/person.schemas"

export type CreatePersonDTO = CreatePersonData

export async function createPerson(
  dto: CreatePersonDTO,
  repo: PersonsRepositoryPort
): Promise<Person | null> {
  return repo.create(dto)
}
