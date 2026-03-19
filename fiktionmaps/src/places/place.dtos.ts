/** Data required to create a new place (creates location + place row). */
export interface CreatePlaceData {
  fictionId: string
  cityId: string
  name: string
  formattedAddress: string
  latitude: number
  longitude: number
  description: string
  isLandmark?: boolean
  locationType?: string | null
}

/** Data to update an existing place (updates linked location + place row). */
export interface UpdatePlaceData {
  fictionId: string
  cityId: string
  name: string
  formattedAddress: string
  latitude: number
  longitude: number
  description: string
  isLandmark?: boolean
  locationType?: string | null
}
