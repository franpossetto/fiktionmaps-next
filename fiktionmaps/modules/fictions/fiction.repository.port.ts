import type { Fiction } from "./fiction.domain"
import type { UpdateFictionData } from "./fiction.dtos"

export interface FictionsRepositoryPort {
  getAll(): Promise<Fiction[]>
  getById(id: string): Promise<Fiction | null>
  update(id: string, data: UpdateFictionData): Promise<Fiction | null>
}
