import type { Place } from "@/src/places/domain/place.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function listAllPlacesUseCase(repo: PlacesRepositoryPort): Promise<Place[]> {
  return repo.listAllPlaces()
}
