import type { Fiction } from "./fiction.domain"
import type { CreateFictionData, UpdateFictionData } from "./fiction.dtos"

export interface FictionsRepositoryPort {
  getAll(): Promise<Fiction[]>
  getById(id: string): Promise<Fiction | null>
  create(data: CreateFictionData): Promise<Fiction | null>
  update(id: string, data: UpdateFictionData): Promise<Fiction | null>
  delete(id: string): Promise<boolean>
}
