import type { Place } from "@/src/places/domain/place.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function getCityPlacesUseCase(
  cityId: string,
  repo: PlacesRepositoryPort
): Promise<Place[]> {
  return repo.getByCityId(cityId)
}
