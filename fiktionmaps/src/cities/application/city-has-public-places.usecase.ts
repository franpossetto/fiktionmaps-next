import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"

export async function cityHasPublicPlacesUseCase(
  cityId: string,
  repo: CitiesRepositoryPort
): Promise<boolean> {
  return repo.hasPublicPlaces(cityId)
}
