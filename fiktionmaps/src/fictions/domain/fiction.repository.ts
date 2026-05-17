import type { Fiction, FictionWithMedia } from "./fiction.entity"
import type { CreateFictionData, UpdateFictionData } from "./fiction.schemas"

export type FindActiveContributeDuplicateParams = {
  title: string
  year: number
  type: Fiction["type"]
}

export interface FictionsRepositoryPort {
  getAll(): Promise<FictionWithMedia[]>
  getByIds(ids: string[]): Promise<FictionWithMedia[]>
  getById(id: string): Promise<FictionWithMedia | null>
  getBySlug(slug: string): Promise<FictionWithMedia | null>
  /** Active fictions only; title + year + type (case-insensitive title). */
  findActiveDuplicateForContribute(params: FindActiveContributeDuplicateParams): Promise<FictionWithMedia | null>
  findSlugsByPrefix(prefix: string, excludeId?: string): Promise<string[]>
  create(data: CreateFictionData): Promise<FictionWithMedia | null>
  update(id: string, data: UpdateFictionData): Promise<FictionWithMedia | null>
  delete(id: string): Promise<boolean>
}
