import type { Place } from "@/src/places/domain/place.entity"
import type {
  PlaceAvatarVariant,
  PlacesRepositoryPort,
} from "@/src/places/domain/place.repository"

export async function getPlaceByIdUseCase(
  placeId: string,
  repo: PlacesRepositoryPort,
  avatarVariant: PlaceAvatarVariant = "sm",
): Promise<Place | null> {
  return repo.getById(placeId, avatarVariant)
}
