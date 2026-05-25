/** One fiction present in one city (≥1 active place). Used for map unified search. */
export interface MapFictionCitySearchEntry {
  fictionId: string
  cityId: string
  fictionTitle: string
  cityName: string
  country: string
  coverImage: string | null
}

export interface FictionCityPairKey {
  fictionId: string
  cityId: string
}
