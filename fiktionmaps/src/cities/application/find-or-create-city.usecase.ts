import type { City } from "@/src/cities/domain/city.entity"
import type { CreateCityData } from "@/src/cities/domain/city.schemas"
import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"

export async function findOrCreateCityUseCase(
  data: CreateCityData,
  repo: CitiesRepositoryPort
): Promise<City | null> {
  const existing = await repo.findByNameAndCountry(data.name, data.country)
  if (existing) return existing
  return repo.create(data)
}
