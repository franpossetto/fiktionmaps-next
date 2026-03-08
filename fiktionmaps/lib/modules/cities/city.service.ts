import type { Fiction } from "@/lib/modules/fictions/fiction.model"
import type { IFictionRepository } from "@/lib/modules/fictions/fiction.repository"
import type { ILocationRepository } from "@/lib/modules/locations/location.repository"
import type { City } from "./city.model"
import type { ICityRepository } from "./city.repository"

export class CityService {
  constructor(
    private cityRepo: ICityRepository,
    private locationRepo: ILocationRepository,
    private fictionRepo: IFictionRepository,
  ) {}

  async getAll(): Promise<City[]> {
    return this.cityRepo.getAll()
  }

  async getById(id: string): Promise<City | undefined> {
    return this.cityRepo.getById(id)
  }

  async getCityFictions(cityId: string): Promise<Fiction[]> {
    const locations = await this.locationRepo.getByCityId(cityId)
    const fictionIds = [...new Set(locations.map((l) => l.fictionId))]
    const allFictions = await this.fictionRepo.getAll()
    return allFictions.filter((f) => fictionIds.includes(f.id))
  }
}
