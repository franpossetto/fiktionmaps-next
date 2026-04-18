import type { City } from "@/src/cities/domain/city.entity"
import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"

export async function getCityByIdUseCase(id: string, repo: CitiesRepositoryPort): Promise<City | null> {
  return repo.getById(id)
}
