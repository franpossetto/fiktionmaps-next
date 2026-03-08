import seedToursData from "@/data/tours.json"
import type { StoredTourRecord, Tour } from "./tour.model"
import type { ITourRepository } from "./tour.repository"

const TOURS_STORAGE_KEY = "fiktionmaps.tours.v1"

export class MockTourRepository implements ITourRepository {
  private seedRecords: StoredTourRecord[] = seedToursData as StoredTourRecord[]

  async listAll(): Promise<StoredTourRecord[]> {
    return [...this.seedRecords, ...this.readFromStorage()]
  }

  async getBySlug(slug: string): Promise<StoredTourRecord | null> {
    const all = [...this.seedRecords, ...this.readFromStorage()]
    return all.find((r) => r.tour.slug === slug) ?? null
  }

  async getUserTours(userId: string): Promise<Tour[]> {
    return this.readFromStorage()
      .map((r) => r.tour)
      .filter((t) => t.createdBy === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async save(record: StoredTourRecord): Promise<void> {
    const records = this.readFromStorage()
    records.push(record)
    this.writeToStorage(records)
  }

  private readFromStorage(): StoredTourRecord[] {
    if (typeof window === "undefined") return []
    try {
      const raw = window.localStorage.getItem(TOURS_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as StoredTourRecord[]
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  }

  private writeToStorage(records: StoredTourRecord[]): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(TOURS_STORAGE_KEY, JSON.stringify(records))
  }
}
