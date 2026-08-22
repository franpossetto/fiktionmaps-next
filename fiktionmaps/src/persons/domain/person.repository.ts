import type { Person, FictionPerson } from "./person.entity"
import type { CreatePersonData, FictionPersonEntry, UpdatePersonData } from "./person.schemas"

export interface PersonsRepositoryPort {
  getAll(): Promise<Person[]>
  search(query: string): Promise<Person[]>
  /** Distinct persons linked to any fiction with the given role; optional name substring (case-insensitive). */
  listPersonsWithFictionRole(role: string, nameQuery: string | null, limit: number): Promise<Person[]>
  getById(id: string): Promise<Person | null>
  /** Case-insensitive exact match on trimmed name. */
  findByNormalizedName(name: string): Promise<Person | null>
  create(data: CreatePersonData): Promise<Person | null>
  update(id: string, data: UpdatePersonData): Promise<Person | null>
  delete(id: string): Promise<boolean>
  getByFictionId(fictionId: string): Promise<FictionPerson[]>
  setForFiction(fictionId: string, entries: FictionPersonEntry[]): Promise<void>
}
