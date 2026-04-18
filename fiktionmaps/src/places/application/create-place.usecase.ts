import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { CreatePlaceData } from "@/src/places/domain/place.schemas"

export async function createPlaceUseCase(
  data: CreatePlaceData,
  repo: PlacesRepositoryPort
): Promise<{ placeId: string } | null> {
  return repo.create(data)
}
