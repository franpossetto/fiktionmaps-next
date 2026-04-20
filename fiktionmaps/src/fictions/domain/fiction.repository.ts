import type { FictionWithMedia } from "./fiction.entity"
import type { CreateFictionData, UpdateFictionData } from "./fiction.schemas"

export interface FictionsRepositoryPort {
  getAll(): Promise<FictionWithMedia[]>
  getByIds(ids: string[]): Promise<FictionWithMedia[]>
  getById(id: string): Promise<FictionWithMedia | null>
  getBySlug(slug: string): Promise<FictionWithMedia | null>
  findSlugsByPrefix(prefix: string, excludeId?: string): Promise<string[]>
  create(data: CreateFictionData): Promise<FictionWithMedia | null>
  update(id: string, data: UpdateFictionData): Promise<FictionWithMedia | null>
  delete(id: string): Promise<boolean>
}
