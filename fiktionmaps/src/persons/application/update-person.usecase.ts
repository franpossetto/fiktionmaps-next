import type { Person } from "@/src/persons/domain/person.entity"
import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"
import type { UpdatePersonData } from "@/src/persons/domain/person.schemas"

export type UpdatePersonDTO = UpdatePersonData

export async function updatePerson(
  id: string,
  dto: UpdatePersonDTO,
  repo: PersonsRepositoryPort
): Promise<Person | null> {
  return repo.update(id, dto)
}
