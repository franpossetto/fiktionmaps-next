import type { Location } from "@/src/locations/domain/location.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function getCityLocationsUseCase(
  cityId: string,
  repo: PlacesRepositoryPort
): Promise<Location[]> {
  return repo.getByCityId(cityId)
}
