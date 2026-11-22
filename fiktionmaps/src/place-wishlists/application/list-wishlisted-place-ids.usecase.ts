import type { PlaceWishlistsRepositoryPort } from "@/src/place-wishlists/domain/place-wishlist.repository"

export async function listWishlistedPlaceIdsUseCase(
  userId: string,
  placeIds: string[],
  repo: PlaceWishlistsRepositoryPort,
): Promise<string[]> {
  const unique = [...new Set(placeIds.filter(Boolean))]
  if (unique.length === 0) return []
  return repo.listWishlistedPlaceIds(userId, unique)
}
