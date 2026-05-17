import type { Place } from "@/src/places/domain/place.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function getPlaceByIdUseCase(
  placeId: string,
  repo: PlacesRepositoryPort,
  avatarVariant: "sm" | "lg" = "sm",
): Promise<Place | null> {
  return repo.getById(placeId, avatarVariant)
}
