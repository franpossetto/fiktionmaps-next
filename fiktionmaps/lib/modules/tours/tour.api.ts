import type { StoredTourRecord, Tour } from "./tour.model"
import type { ITourRepository } from "./tour.repository"

export class ApiTourRepository implements ITourRepository {
  constructor(private baseUrl: string) {}

  async listAll(): Promise<StoredTourRecord[]> {
    const res = await fetch(`${this.baseUrl}/tours`)
    if (!res.ok) throw new Error(`Failed to fetch tours: ${res.status}`)
    return res.json()
  }

  async getBySlug(slug: string): Promise<StoredTourRecord | null> {
    const res = await fetch(`${this.baseUrl}/tours/${slug}`)
    if (!res.ok) return null
    return res.json()
  }

  async getUserTours(userId: string): Promise<Tour[]> {
    const res = await fetch(`${this.baseUrl}/tours?userId=${userId}`)
    if (!res.ok) throw new Error(`Failed to fetch user tours: ${res.status}`)
    return res.json()
  }

  async save(record: StoredTourRecord): Promise<void> {
    const res = await fetch(`${this.baseUrl}/tours`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    })
    if (!res.ok) throw new Error(`Failed to save tour: ${res.status}`)
  }
}
