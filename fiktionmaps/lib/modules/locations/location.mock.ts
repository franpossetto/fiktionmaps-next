import locationsData from "@/data/locations.json"
import type { Location } from "./location.model"
import type { ILocationRepository } from "./location.repository"

export class MockLocationRepository implements ILocationRepository {
  private locations: Location[] = locationsData as Location[]

  async getAll(): Promise<Location[]> {
    return this.locations
  }

  async getById(id: string): Promise<Location | undefined> {
    return this.locations.find((l) => l.id === id)
  }

  async getByCityId(cityId: string): Promise<Location[]> {
    return this.locations.filter((l) => l.cityId === cityId)
  }

  async getByFictionId(fictionId: string): Promise<Location[]> {
    return this.locations.filter((l) => l.fictionId === fictionId)
  }

  async getFiltered(cityId: string, fictionIds: string[]): Promise<Location[]> {
    return this.locations.filter(
      (l) => l.cityId === cityId && fictionIds.includes(l.fictionId),
    )
  }
}
