import type { Location } from "./location.domain"

export interface LocationsRepositoryPort {
  getAll(): Promise<Location[]>
  getById(id: string): Promise<Location | null>
  getByCityId(cityId: string): Promise<Location[]>
  getByFictionId(fictionId: string): Promise<Location[]>
  getFiltered(cityId: string, fictionIds: string[]): Promise<Location[]>
}
