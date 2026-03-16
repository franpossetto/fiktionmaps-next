import type { FictionWithMedia } from "./fiction.domain"
import type { CreateFictionData, UpdateFictionData } from "./fiction.dtos"

export interface FictionsRepositoryPort {
  getAll(): Promise<FictionWithMedia[]>
  getById(id: string): Promise<FictionWithMedia | null>
  create(data: CreateFictionData): Promise<FictionWithMedia | null>
  update(id: string, data: UpdateFictionData): Promise<FictionWithMedia | null>
  delete(id: string): Promise<boolean>
}
