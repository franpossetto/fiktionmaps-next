import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { PlaceRelationship } from "@/src/place-relationships/domain/place-relationship.entity"
import type { CreatePlaceRelationshipInput } from "@/src/place-relationships/domain/place-relationship.schemas"
import type { PlaceRelationshipsRepositoryPort } from "@/src/place-relationships/domain/place-relationship.repository"
import {
  resolveUniqueRelationshipSlug,
  slugBaseFromRelationshipName,
} from "@/src/place-relationships/domain/place-relationship-slug"

const ALREADY_IN_OTHER_GROUP =
  "One or more places already belong to a different group of this type. Remove them first (merge is disabled)."

export async function createPlaceRelationshipUseCase(
  input: CreatePlaceRelationshipInput,
  deps: {
    relationships: PlaceRelationshipsRepositoryPort
    places: PlacesRepositoryPort
  },
): Promise<PlaceRelationship> {
  const placeIds = [...new Set(input.placeIds)]
  if (placeIds.length < 2) {
    throw new Error("A relationship needs at least two distinct places")
  }

  const places = await deps.places.getByIds(placeIds)
  if (places.length !== placeIds.length) {
    throw new Error("One or more places were not found")
  }

  if (input.type === "composite") {
    const fictionIds = new Set(places.map((p) => p.fictionId))
    if (fictionIds.size > 1) {
      throw new Error("Composite members must belong to the same fiction in v1")
    }
  }

  for (const placeId of placeIds) {
    const existing = await deps.relationships.getMembership(placeId, input.type)
    if (existing) {
      throw new Error(ALREADY_IN_OTHER_GROUP)
    }
  }

  const existingSlugs = await deps.relationships.listSlugs()
  const base = input.slug?.trim()
    ? input.slug.trim()
    : slugBaseFromRelationshipName(input.name)
  const slug = resolveUniqueRelationshipSlug(base, existingSlugs)

  return deps.relationships.create({
    type: input.type,
    name: input.name.trim(),
    slug,
    placeIds,
  })
}
