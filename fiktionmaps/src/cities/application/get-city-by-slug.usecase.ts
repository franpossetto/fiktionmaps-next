import type { City } from "@/src/cities/domain/city.entity"
import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"

export async function getCityBySlugUseCase(
  slug: string,
  repo: CitiesRepositoryPort
): Promise<City | null> {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null
  return repo.getBySlug(normalized)
}
