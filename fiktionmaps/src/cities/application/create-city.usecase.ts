import type { City } from "@/src/cities/domain/city.entity"
import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"
import type { CreateCityData } from "@/src/cities/domain/city.schemas"

export async function createCityUseCase(data: CreateCityData, repo: CitiesRepositoryPort): Promise<City | null> {
  return repo.create(data)
}
