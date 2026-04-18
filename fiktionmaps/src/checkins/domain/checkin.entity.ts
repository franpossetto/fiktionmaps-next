export interface CityCheckin {
  id: string
  userId: string
  cityId: string
  lat: number | null
  lng: number | null
  origin: "auto" | "manual"
  checkedAt: string
}

export interface PlaceCheckin {
  id: string
  userId: string
  placeId: string
  lat: number | null
  lng: number | null
  distanceM: number | null
  verified: boolean | null
  origin: "gps" | "manual"
  checkedAt: string
}

/** Place check-in row for profile UI (joined place, fiction, city, images). */
export interface EnrichedPlaceCheckin {
  id: string
  placeId: string
  placeName: string
  placeAddress: string
  placeImage: string | null
  fictionId: string
  fictionTitle: string
  fictionCover: string | null
  cityId: string | null
  cityName: string | null
  verified: boolean | null
  distanceM: number | null
  checkedAt: string
}
