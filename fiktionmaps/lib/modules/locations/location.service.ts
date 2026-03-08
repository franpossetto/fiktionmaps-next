import type { Location } from "./location.model"
import type { ILocationRepository } from "./location.repository"

export class LocationService {
  constructor(private locationRepo: ILocationRepository) {}

  async getAll(): Promise<Location[]> {
    return this.locationRepo.getAll()
  }

  async getById(id: string): Promise<Location | undefined> {
    return this.locationRepo.getById(id)
  }

  async getByCityId(cityId: string): Promise<Location[]> {
    return this.locationRepo.getByCityId(cityId)
  }

  async getByFictionId(fictionId: string): Promise<Location[]> {
    return this.locationRepo.getByFictionId(fictionId)
  }

  async getFiltered(cityId: string, fictionIds: string[]): Promise<Location[]> {
    return this.locationRepo.getFiltered(cityId, fictionIds)
  }
}
