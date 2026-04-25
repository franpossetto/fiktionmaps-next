import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"

export interface DeletePersonDTO {
  id: string
}

export async function deletePerson(
  dto: DeletePersonDTO,
  repo: PersonsRepositoryPort
): Promise<boolean> {
  return repo.delete(dto.id)
}
