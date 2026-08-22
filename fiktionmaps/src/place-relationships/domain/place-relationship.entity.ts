import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"

export type PlaceRelationshipType = "shared" | "composite"

export type PlaceRelationshipMember = {
  id: string
  placeRelationshipId: string
  type: PlaceRelationshipType
  placeId: string
  createdAt: string
}

export type PlaceRelationship = {
  id: string
  type: PlaceRelationshipType
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  members: PlaceRelationshipMember[]
}

/** Member place summary for admin / public panels. */
export type PlaceRelationshipMemberPlace = {
  placeId: string
  name: string
  slug: string
  fictionId: string
  fictionTitle: string
  fictionSlug: string
  /** Avatar thumb URL, null when the place has no photo yet. */
  image: string | null
  imageFocus: { x: number; y: number } | null
  shootEnvironment: PlaceShootEnvironment | null
}

export type PlaceRelationshipWithPlaces = PlaceRelationship & {
  memberPlaces: PlaceRelationshipMemberPlace[]
}
