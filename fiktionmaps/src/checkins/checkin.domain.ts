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
