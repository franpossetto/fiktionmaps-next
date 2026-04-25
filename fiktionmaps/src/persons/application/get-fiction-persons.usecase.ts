import type { FictionPerson } from "@/src/persons/domain/person.entity"
import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"

export interface GetFictionPersonsDTO {
  fictionId: string
}

export async function getFictionPersons(
  dto: GetFictionPersonsDTO,
  repo: PersonsRepositoryPort
): Promise<FictionPerson[]> {
  return repo.getByFictionId(dto.fictionId)
}
