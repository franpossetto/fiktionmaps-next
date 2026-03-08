import type { StoredTourRecord, Tour } from "./tour.model"

export interface ITourRepository {
  listAll(): Promise<StoredTourRecord[]>
  getBySlug(slug: string): Promise<StoredTourRecord | null>
  getUserTours(userId: string): Promise<Tour[]>
  save(record: StoredTourRecord): Promise<void>
}
