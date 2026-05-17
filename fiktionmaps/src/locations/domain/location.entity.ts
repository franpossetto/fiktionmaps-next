export interface Location {
  name: string
  address: string
  lat: number
  lng: number
  cityId: string
  locationType?: string | null
  isLandmark?: boolean
}
