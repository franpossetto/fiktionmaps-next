import { getSessionUserId } from "@/lib/auth/auth.service"
import { createClient } from "@/lib/supabase/server"
import { isUuidString } from "@/lib/validation/primitives"
import { isPlaceWishlistedUseCase } from "@/src/place-wishlists/application/is-place-wishlisted.usecase"
import { getWishlistCityCollectionUseCase } from "@/src/place-wishlists/application/get-wishlist-city-collection.usecase"
import { listPlaceWishlistItemsUseCase } from "@/src/place-wishlists/application/list-place-wishlist-items.usecase"
import { listWishlistedPlaceIdsUseCase } from "@/src/place-wishlists/application/list-wishlisted-place-ids.usecase"
import type {
  PlaceWishlistItem,
  WishlistCityCollection,
} from "@/src/place-wishlists/domain/place-wishlist.entity"
import { createPlaceWishlistsSupabaseAdapter } from "@/src/place-wishlists/infrastructure/supabase/place-wishlist.repository.impl"

const sessionWishlistRepo = createPlaceWishlistsSupabaseAdapter(createClient)

/** Place-detail RSC hydrate. User-scoped — not cached. */
export async function isPlaceWishlistedForSession(placeId: string): Promise<boolean> {
  if (!isUuidString(placeId)) return false
  const userId = await getSessionUserId()
  if (!userId) return false
  return isPlaceWishlistedUseCase(userId, placeId, sessionWishlistRepo)
}

/** Fiction place list hydrate. User-scoped — not cached. */
export async function listWishlistedPlaceIdsForSession(placeIds: string[]): Promise<string[]> {
  const unique = [...new Set(placeIds.filter((id) => isUuidString(id)))]
  if (unique.length === 0) return []
  const userId = await getSessionUserId()
  if (!userId) return []
  return listWishlistedPlaceIdsUseCase(userId, unique, sessionWishlistRepo)
}

/** Own-profile list. User-scoped — not cached. */
export async function listPlaceWishlistItemsForCurrentUser(): Promise<PlaceWishlistItem[]> {
  const userId = await getSessionUserId()
  if (!userId) return []
  return listPlaceWishlistItemsUseCase(userId, sessionWishlistRepo)
}

/** Own city-collection page. User-scoped — not cached. */
export async function getWishlistCityCollectionForSession(
  citySlug: string | null,
): Promise<WishlistCityCollection | null> {
  const userId = await getSessionUserId()
  if (!userId) return null
  return getWishlistCityCollectionUseCase(userId, citySlug, sessionWishlistRepo)
}
