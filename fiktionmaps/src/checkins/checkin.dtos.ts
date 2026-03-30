export interface CreateCityCheckinData {
  cityId: string
  lat?: number | null
  lng?: number | null
  origin: "auto" | "manual"
}

export interface CreatePlaceCheckinData {
  placeId: string
  lat: number
  lng: number
}

export interface PlaceCheckinResult {
  id: string
  placeId: string
  verified: boolean
  distanceM: number
  origin: "gps" | "manual"
}
