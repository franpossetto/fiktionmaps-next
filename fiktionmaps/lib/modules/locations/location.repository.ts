import type { Location } from "./location.model"

export interface ILocationRepository {
  getAll(): Promise<Location[]>
  getById(id: string): Promise<Location | undefined>
  getByCityId(cityId: string): Promise<Location[]>
  getByFictionId(fictionId: string): Promise<Location[]>
  getFiltered(cityId: string, fictionIds: string[]): Promise<Location[]>
}
