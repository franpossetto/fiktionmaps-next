import type { PlaceWishlistItem } from "./place-wishlist.entity"

export interface PlaceWishlistsRepositoryPort {
  isWishlisted(userId: string, placeId: string): Promise<boolean>
  /** Which of `placeIds` the user has on their wishlist. */
  listWishlistedPlaceIds(userId: string, placeIds: string[]): Promise<string[]>
  toggle(userId: string, placeId: string): Promise<boolean>
  listItemsForUser(userId: string): Promise<PlaceWishlistItem[]>
}
