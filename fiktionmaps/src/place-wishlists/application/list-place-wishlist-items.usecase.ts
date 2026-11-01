import type { PlaceWishlistItem } from "@/src/place-wishlists/domain/place-wishlist.entity"
import type { PlaceWishlistsRepositoryPort } from "@/src/place-wishlists/domain/place-wishlist.repository"

export async function listPlaceWishlistItemsUseCase(
  userId: string,
  repo: PlaceWishlistsRepositoryPort,
): Promise<PlaceWishlistItem[]> {
  return repo.listItemsForUser(userId)
}
