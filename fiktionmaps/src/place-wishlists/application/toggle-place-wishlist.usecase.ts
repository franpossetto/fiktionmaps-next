import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { PlaceWishlistsRepositoryPort } from "@/src/place-wishlists/domain/place-wishlist.repository"

export type TogglePlaceWishlistResult =
  | { success: true; wishlisted: boolean }
  | { success: false; error: string }

export async function togglePlaceWishlistUseCase(
  userId: string,
  placeId: string,
  wishlistRepo: PlaceWishlistsRepositoryPort,
  placesRepo: Pick<PlacesRepositoryPort, "isApprovedActivePlace">,
): Promise<TogglePlaceWishlistResult> {
  const eligible = await placesRepo.isApprovedActivePlace(placeId)
  if (!eligible) {
    return { success: false, error: "Place not found or not available" }
  }
  const wishlisted = await wishlistRepo.toggle(userId, placeId)
  return { success: true, wishlisted }
}
