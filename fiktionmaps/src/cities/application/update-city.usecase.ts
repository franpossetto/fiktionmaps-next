import type { City } from "@/src/cities/domain/city.entity"
import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"
import type { UpdateCityData } from "@/src/cities/domain/city.schemas"

export async function updateCityUseCase(id: string, data: UpdateCityData, repo: CitiesRepositoryPort): Promise<City | null> {
  return repo.update(id, data)
}
