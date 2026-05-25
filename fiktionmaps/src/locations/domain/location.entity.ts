import type { StreetViewReference } from "@/src/locations/domain/location-view-reference.schemas"

export interface Location {
  name: string
  address: string
  lat: number
  lng: number
  cityId: string
  locationType?: string | null
  isLandmark?: boolean
  streetViewReference?: StreetViewReference | null
}
