import type { Location } from "@/src/locations/domain/location.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function getPlaceByIdUseCase(
  placeId: string,
  repo: PlacesRepositoryPort,
): Promise<Location | null> {
  return repo.getById(placeId)
}
