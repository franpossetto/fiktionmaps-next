export interface PlaceWishlist {
  userId: string
  placeId: string
  createdAt: string
}

/** Profile card: wishlist row joined with place, fiction, city, and image. */
export interface PlaceWishlistItem {
  placeId: string
  placeSlug: string
  placeName: string
  placeImage: string | null
  fictionId: string
  fictionSlug: string
  fictionTitle: string
  lat: number | null
  lng: number | null
  address: string | null
  cityId: string | null
  cityName: string | null
  citySlug: string | null
  cityImage: string | null
  cityCountry: string | null
  createdAt: string
}

export type WishlistCitySummary = {
  key: string
  citySlug: string | null
  cityName: string | null
  cityImage: string | null
  cityCountry: string | null
  count: number
}

export type WishlistCityCollection = {
  selected: WishlistCitySummary
  items: PlaceWishlistItem[]
  cities: WishlistCitySummary[]
}
