import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"
import type { FictionPersonEntry } from "@/src/persons/domain/person.schemas"

export interface SetFictionPersonsDTO {
  fictionId: string
  entries: FictionPersonEntry[]
}

export async function setFictionPersons(
  dto: SetFictionPersonsDTO,
  repo: PersonsRepositoryPort
): Promise<void> {
  return repo.setForFiction(dto.fictionId, dto.entries)
}
