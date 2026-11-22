import type { PlaceWishlistsRepositoryPort } from "@/src/place-wishlists/domain/place-wishlist.repository"

export async function isPlaceWishlistedUseCase(
  userId: string,
  placeId: string,
  repo: PlaceWishlistsRepositoryPort,
): Promise<boolean> {
  return repo.isWishlisted(userId, placeId)
}
