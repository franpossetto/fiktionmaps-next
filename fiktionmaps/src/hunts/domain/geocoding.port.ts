export interface HuntGeocodingResult {
  lat: number
  lng: number
  formattedAddress: string
  provider: "mapbox" | "google"
}

export interface HuntGeocodingPort {
  readonly name: string
  geocode(query: string): Promise<HuntGeocodingResult | null>
}
