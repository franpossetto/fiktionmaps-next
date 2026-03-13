import type { City } from "./city.domain"
import type { UpdateCityData } from "./city.dtos"

export interface CitiesRepositoryPort {
  getAll(): Promise<City[]>
  getById(id: string): Promise<City | null>
  update(id: string, data: UpdateCityData): Promise<City | null>
}
