import type { Location } from "@/src/locations/domain/location.entity"
import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"

export interface Place {
  id: string
  placeId: string
  name: string
  slug: string
  fictionId: string
  location: Location
  image: string
  videoUrl: string
  description: string
  sceneDescription: string
  sceneQuote?: string
  visitTip?: string
  sceneTitle?: string | null
  shootEnvironment?: PlaceShootEnvironment | null
}
