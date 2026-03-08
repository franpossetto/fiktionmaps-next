import type { Fiction } from "./fiction.model"
import type { IFictionRepository } from "./fiction.repository"

export class ApiFictionRepository implements IFictionRepository {
  constructor(private baseUrl: string) {}

  async getAll(): Promise<Fiction[]> {
    const res = await fetch(`${this.baseUrl}/fictions`)
    if (!res.ok) throw new Error(`Failed to fetch fictions: ${res.status}`)
    return res.json()
  }

  async getById(id: string): Promise<Fiction | undefined> {
    const res = await fetch(`${this.baseUrl}/fictions/${id}`)
    if (!res.ok) return undefined
    return res.json()
  }

  async update(
    id: string,
    data: Partial<Omit<Fiction, "id">>,
  ): Promise<Fiction | undefined> {
    const res = await fetch(`${this.baseUrl}/fictions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`Failed to update fiction: ${res.status}`)
    return res.json()
  }
}
