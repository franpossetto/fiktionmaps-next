export interface CreateCityData {
  name: string
  country: string
  lat: number
  lng: number
  zoom: number
}

export interface UpdateCityData {
  name?: string
  country?: string
  lat?: number
  lng?: number
  zoom?: number
}
