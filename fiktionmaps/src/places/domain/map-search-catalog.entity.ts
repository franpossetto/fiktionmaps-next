import type { MapFictionCitySearchEntry } from "@/src/places/domain/map-fiction-city-pair.entity"

/** Minimal fiction fields for map search catalog assembly (avoids cross-feature domain imports). */
export type MapSearchCatalogFictionRef = {
  id: string
  title: string
  active: boolean
  coverImage?: string | null
  coverImageLarge?: string | null
}

/** Minimal city fields for map search catalog assembly. */
export type MapSearchCatalogCityRef = {
  id: string
  name: string
  country: string
}

export type MapCitySearchEntry = {
  cityId: string
  cityName: string
  country: string
}

export type MapSearchCatalog = {
  fictionCityPairs: MapFictionCitySearchEntry[]
  citiesWithPlaces: MapCitySearchEntry[]
}
