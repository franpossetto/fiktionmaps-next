import type { City } from "@/src/cities/domain/city.entity"
import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"

/** Cities eligible for public indexing (have approved + active places). */
export async function listCitiesForSitemapUseCase(
  repo: CitiesRepositoryPort
): Promise<City[]> {
  return repo.listWithPublicPlaces()
}
