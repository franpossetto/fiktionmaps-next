import type { Location } from "@/src/locations/domain/location.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function getPlaceByIdUseCase(
  placeId: string,
  repo: PlacesRepositoryPort,
  avatarVariant: "sm" | "lg" = "sm",
): Promise<Location | null> {
  return repo.getById(placeId, avatarVariant)
}
