import type { Location } from "./location.model"
import type { ILocationRepository } from "./location.repository"

export class ApiLocationRepository implements ILocationRepository {
  constructor(private baseUrl: string) {}

  async getAll(): Promise<Location[]> {
    const res = await fetch(`${this.baseUrl}/locations`)
    if (!res.ok) throw new Error(`Failed to fetch locations: ${res.status}`)
    return res.json()
  }

  async getById(id: string): Promise<Location | undefined> {
    const res = await fetch(`${this.baseUrl}/locations/${id}`)
    if (!res.ok) return undefined
    return res.json()
  }

  async getByCityId(cityId: string): Promise<Location[]> {
    const res = await fetch(`${this.baseUrl}/locations?cityId=${cityId}`)
    if (!res.ok) throw new Error(`Failed to fetch locations by city: ${res.status}`)
    return res.json()
  }

  async getByFictionId(fictionId: string): Promise<Location[]> {
    const res = await fetch(`${this.baseUrl}/locations?fictionId=${fictionId}`)
    if (!res.ok) throw new Error(`Failed to fetch locations by fiction: ${res.status}`)
    return res.json()
  }

  async getFiltered(cityId: string, fictionIds: string[]): Promise<Location[]> {
    const params = new URLSearchParams({ cityId })
    fictionIds.forEach((id) => params.append("fictionId", id))
    const res = await fetch(`${this.baseUrl}/locations?${params}`)
    if (!res.ok) throw new Error(`Failed to fetch filtered locations: ${res.status}`)
    return res.json()
  }
}
