import type { Location } from "@/src/locations/domain/location.entity"
import type { PlaceRelationKind } from "@/src/places/domain/place-relation-kind"
import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"

export interface Place {
  id: string
  placeId: string
  name: string
  slug: string
  fictionId: string
  location: Location
  image: string
  /** Focal point for `image` (avatar role). Defaults to center when omitted. */
  imageFocus?: { x: number; y: number } | null
  videoUrl: string
  description: string
  sceneDescription: string
  sceneQuote?: string
  visitTip?: string
  sceneTitle?: string | null
  relationKind: PlaceRelationKind
  shootEnvironment?: PlaceShootEnvironment | null
}
