import type { City } from "@/lib/modules/cities/city.model"
import type { ICityRepository } from "@/lib/modules/cities/city.repository"
import type { ILocationRepository } from "@/lib/modules/locations/location.repository"
import type { Fiction } from "./fiction.model"
import type { IFictionRepository } from "./fiction.repository"

export class FictionService {
  constructor(
    private fictionRepo: IFictionRepository,
    private locationRepo: ILocationRepository,
    private cityRepo: ICityRepository,
  ) {}

  async getAll(): Promise<Fiction[]> {
    return this.fictionRepo.getAll()
  }

  async getById(id: string): Promise<Fiction | undefined> {
    return this.fictionRepo.getById(id)
  }

  async update(id: string, data: Partial<Omit<Fiction, "id">>): Promise<Fiction | undefined> {
    return this.fictionRepo.update(id, data)
  }

  async getFictionCities(fictionId: string): Promise<City[]> {
    const locations = await this.locationRepo.getByFictionId(fictionId)
    const cityIds = [...new Set(locations.map((l) => l.cityId))]
    const allCities = await this.cityRepo.getAll()
    return allCities.filter((c) => cityIds.includes(c.id))
  }
}
