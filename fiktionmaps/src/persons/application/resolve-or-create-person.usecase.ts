import type { Person } from "@/src/persons/domain/person.entity"
import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"

export async function resolveOrCreatePerson(
  name: string,
  repo: PersonsRepositoryPort,
): Promise<Person | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const existing = await repo.findByNormalizedName(trimmed)
  if (existing) return existing

  return repo.create({ name: trimmed })
}
