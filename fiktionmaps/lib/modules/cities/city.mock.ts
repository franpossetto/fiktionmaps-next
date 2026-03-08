import citiesData from "@/data/cities.json"
import type { City } from "./city.model"
import type { ICityRepository } from "./city.repository"

export class MockCityRepository implements ICityRepository {
  private cities: City[] = citiesData as City[]

  async getAll(): Promise<City[]> {
    return this.cities
  }

  async getById(id: string): Promise<City | undefined> {
    return this.cities.find((c) => c.id === id)
  }
}
