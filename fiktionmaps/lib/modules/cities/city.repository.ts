import type { City } from "./city.model"

export interface ICityRepository {
  getAll(): Promise<City[]>
  getById(id: string): Promise<City | undefined>
}
