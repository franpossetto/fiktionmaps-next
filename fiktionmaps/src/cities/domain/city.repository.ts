import type { City } from "./city.entity"
import type { CreateCityData, UpdateCityData } from "./city.schemas"

export interface CitiesRepositoryPort {
  getAll(): Promise<City[]>
  getById(id: string): Promise<City | null>
  findByNameAndCountry(name: string, country: string): Promise<City | null>
  create(data: CreateCityData): Promise<City | null>
  update(id: string, data: UpdateCityData): Promise<City | null>
  delete(id: string): Promise<boolean>
}
