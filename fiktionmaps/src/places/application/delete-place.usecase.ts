import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function deletePlaceUseCase(
  placeId: string,
  repo: PlacesRepositoryPort
): Promise<boolean> {
  return repo.delete(placeId)
}
