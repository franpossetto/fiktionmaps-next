import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { UpdatePlaceData } from "@/src/places/domain/place.schemas"

export async function updatePlaceUseCase(
  placeId: string,
  data: UpdatePlaceData,
  repo: PlacesRepositoryPort
): Promise<boolean> {
  return repo.update(placeId, data)
}
