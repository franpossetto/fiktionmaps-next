import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function listCityIdsWithPlacesUseCase(repo: PlacesRepositoryPort): Promise<string[]> {
  return repo.listCityIdsWithPlaces()
}
