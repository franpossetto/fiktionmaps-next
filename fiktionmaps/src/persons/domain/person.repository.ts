import type { Person, FictionPerson } from "./person.entity"
import type { CreatePersonData, FictionPersonEntry } from "./person.schemas"

export interface PersonsRepositoryPort {
  getAll(): Promise<Person[]>
  search(query: string): Promise<Person[]>
  getById(id: string): Promise<Person | null>
  create(data: CreatePersonData): Promise<Person | null>
  delete(id: string): Promise<boolean>
  getByFictionId(fictionId: string): Promise<FictionPerson[]>
  setForFiction(fictionId: string, entries: FictionPersonEntry[]): Promise<void>
}
