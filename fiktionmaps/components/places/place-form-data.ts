export interface PlaceFormData {
  fictionId: string
  address: string
  locationName: string
  placeName: string
  description: string
  latitude: number
  longitude: number
  formattedAddress: string
  cityId: string
  locationType: string
  relationKind: string
  shootEnvironment: string
  image?: File
  isLandmark: boolean
}
