export interface Location {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  cityId: string
  fictionId: string
  image: string
  videoUrl: string
  description: string
  sceneDescription: string
  sceneQuote?: string
  visitTip?: string
}
