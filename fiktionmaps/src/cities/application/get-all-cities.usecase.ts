import type { City } from "@/src/cities/domain/city.entity"
import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"

export async function getAllCitiesUseCase(repo: CitiesRepositoryPort): Promise<City[]> {
  return repo.getAll()
}
