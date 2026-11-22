import type { Fiction } from "@/src/fictions/domain/fiction.entity"

/** Per-query fetch cap and the merged response cap for `search_catalog`. */
export const PUBLIC_CATALOG_SEARCH_LIMIT = 20

export type PublicCatalogSearchMatch = "place_name" | "fiction_title" | "city"

/** A published place row used to rank catalog search hits. `match` is assigned by the use case. */
export interface PublicCatalogPlaceMatch {
  placeId: string
  placeName: string
  placeSlug: string
  description: string
  lat: number | null
  lng: number | null
  cityName: string
  country: string
  fictionId: string
  fictionTitle: string
  fictionSlug: string
  fictionYear: number
  fictionType: Fiction["type"]
  fictionDescription: string
}

export interface PublicCatalogPlaceHit extends PublicCatalogPlaceMatch {
  kind: "place"
  match: "place_name" | "city"
}

export interface PublicCatalogFictionHit {
  kind: "fiction"
  match: "fiction_title" | "city"
  fictionId: string
  title: string
  slug: string
  year: number
  type: Fiction["type"]
  description: string
  cityName: string | null
  country: string | null
}

export type PublicCatalogSearchHit = PublicCatalogPlaceHit | PublicCatalogFictionHit
