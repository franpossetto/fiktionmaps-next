import type { Scene } from "./scene.model"
import type { ISceneRepository } from "./scene.repository"

export class ApiSceneRepository implements ISceneRepository {
  constructor(private baseUrl: string) {}

  async getAll(): Promise<Scene[]> {
    const res = await fetch(`${this.baseUrl}/scenes`)
    if (!res.ok) throw new Error(`Failed to fetch scenes: ${res.status}`)
    return res.json()
  }

  async getByLocationId(locationId: string): Promise<Scene[]> {
    const res = await fetch(`${this.baseUrl}/scenes?locationId=${locationId}`)
    if (!res.ok) throw new Error(`Failed to fetch scenes by location: ${res.status}`)
    return res.json()
  }

  async getByFictionId(fictionId: string): Promise<Scene[]> {
    const res = await fetch(`${this.baseUrl}/scenes?fictionId=${fictionId}`)
    if (!res.ok) throw new Error(`Failed to fetch scenes by fiction: ${res.status}`)
    return res.json()
  }
}
