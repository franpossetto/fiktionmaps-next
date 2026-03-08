import type { Fiction } from "./fiction.model"

export interface IFictionRepository {
  getAll(): Promise<Fiction[]>
  getById(id: string): Promise<Fiction | undefined>
  update(id: string, data: Partial<Omit<Fiction, "id">>): Promise<Fiction | undefined>
}
