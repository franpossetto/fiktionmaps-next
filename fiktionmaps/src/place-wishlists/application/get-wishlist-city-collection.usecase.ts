import type {
  PlaceWishlistItem,
  WishlistCityCollection,
  WishlistCitySummary,
} from "@/src/place-wishlists/domain/place-wishlist.entity"
import type { PlaceWishlistsRepositoryPort } from "@/src/place-wishlists/domain/place-wishlist.repository"
import { orderWishlistCityTour } from "@/src/place-wishlists/application/order-wishlist-city-tour"

function cityKey(item: PlaceWishlistItem): string {
  return item.citySlug?.trim() || (item.cityId ? `id:${item.cityId}` : "unknown")
}

function toSummary(items: PlaceWishlistItem[]): WishlistCitySummary {
  const first = items[0]
  return {
    key: first ? cityKey(first) : "unknown",
    citySlug: first?.citySlug ?? null,
    cityName: first?.cityName ?? null,
    cityImage: first?.cityImage ?? null,
    cityCountry: first?.cityCountry ?? null,
    count: items.length,
  }
}

function groupByCity(items: PlaceWishlistItem[]): WishlistCitySummary[] {
  const buckets = new Map<string, PlaceWishlistItem[]>()
  for (const item of items) {
    const key = cityKey(item)
    const list = buckets.get(key)
    if (list) list.push(item)
    else buckets.set(key, [item])
  }
  return [...buckets.values()]
    .map(toSummary)
    .sort((a, b) => b.count - a.count || (a.cityName ?? "").localeCompare(b.cityName ?? ""))
}

/** Owner wishlist as a city collection. `citySlug` selects the city; omitted → most places. */
export async function getWishlistCityCollectionUseCase(
  userId: string,
  citySlug: string | null,
  repo: PlaceWishlistsRepositoryPort,
): Promise<WishlistCityCollection | null> {
  const all = await repo.listItemsForUser(userId)
  if (all.length === 0) return null

  const cities = groupByCity(all)
  const wanted = citySlug?.trim() || null
  const selected =
    (wanted
      ? cities.find((c) => c.citySlug === wanted) ??
        (wanted === "unknown" ? cities.find((c) => !c.citySlug) : undefined)
      : undefined) ?? cities[0]
  if (!selected) return null

  const items = orderWishlistCityTour(all.filter((item) => cityKey(item) === selected.key))
  return { selected, items, cities }
}
