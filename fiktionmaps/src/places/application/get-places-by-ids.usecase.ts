import type { Place } from "@/src/places/domain/place.entity"
import type {
  PlaceAvatarVariant,
  PlacesRepositoryPort,
} from "@/src/places/domain/place.repository"

export async function getPlacesByIdsUseCase(
  placeIds: string[],
  repo: Pick<PlacesRepositoryPort, "getByIds">,
  avatarVariant: PlaceAvatarVariant = "sm",
): Promise<Place[]> {
  if (placeIds.length === 0) return []
  return repo.getByIds(placeIds, avatarVariant)
}
