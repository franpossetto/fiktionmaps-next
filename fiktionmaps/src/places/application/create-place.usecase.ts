import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { CreatePlaceRepoInput } from "@/src/places/domain/place.schemas"

export async function createPlaceUseCase(
  data: CreatePlaceRepoInput,
  repo: PlacesRepositoryPort
): Promise<{ placeId: string } | null> {
  return repo.create(data)
}
