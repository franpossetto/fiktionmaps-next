import type { Fiction } from "@/lib/modules/fictions/fiction.model"
import type { Location } from "@/lib/modules/locations/location.model"
import type { CheckIn, UserProfile } from "./user.model"
import type { IUserRepository } from "./user.repository"

export class ApiUserRepository implements IUserRepository {
  constructor(private baseUrl: string) {}

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    const res = await fetch(`${this.baseUrl}/users/${userId}`)
    if (!res.ok) return undefined
    return res.json()
  }

  async getContributedLocations(userId: string): Promise<Location[]> {
    const res = await fetch(`${this.baseUrl}/users/${userId}/contributed-locations`)
    if (!res.ok) throw new Error(`Failed to fetch contributed locations: ${res.status}`)
    return res.json()
  }

  async getContributedFictions(userId: string): Promise<Fiction[]> {
    const res = await fetch(`${this.baseUrl}/users/${userId}/contributed-fictions`)
    if (!res.ok) throw new Error(`Failed to fetch contributed fictions: ${res.status}`)
    return res.json()
  }

  async getContributedPhotos(userId: string): Promise<CheckIn[]> {
    const res = await fetch(`${this.baseUrl}/users/${userId}/contributed-photos`)
    if (!res.ok) throw new Error(`Failed to fetch contributed photos: ${res.status}`)
    return res.json()
  }
}
