import type { City } from "./city.model"
import type { ICityRepository } from "./city.repository"

export class ApiCityRepository implements ICityRepository {
  constructor(private baseUrl: string) {}

  async getAll(): Promise<City[]> {
    const res = await fetch(`${this.baseUrl}/cities`)
    if (!res.ok) throw new Error(`Failed to fetch cities: ${res.status}`)
    return res.json()
  }

  async getById(id: string): Promise<City | undefined> {
    const res = await fetch(`${this.baseUrl}/cities/${id}`)
    if (!res.ok) return undefined
    return res.json()
  }
}
