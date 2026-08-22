import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { AddPlaceRelationshipMemberInput } from "@/src/place-relationships/domain/place-relationship.schemas"
import type { PlaceRelationshipsRepositoryPort } from "@/src/place-relationships/domain/place-relationship.repository"

const ALREADY_IN_OTHER_GROUP =
  "This place already belongs to a different group of this type. Remove it first (merge is disabled)."

export async function addPlaceRelationshipMemberUseCase(
  input: AddPlaceRelationshipMemberInput,
  deps: {
    relationships: PlaceRelationshipsRepositoryPort
    places: PlacesRepositoryPort
  },
): Promise<{ memberPlaceIds: string[] }> {
  const group = await deps.relationships.getById(input.placeRelationshipId)
  if (!group) throw new Error("Place relationship not found")

  const place = await deps.places.getById(input.placeId)
  if (!place) throw new Error("Place not found")

  if (group.members.some((m) => m.placeId === input.placeId)) {
    return { memberPlaceIds: group.members.map((m) => m.placeId) }
  }

  const existing = await deps.relationships.getMembership(input.placeId, group.type)
  if (existing && existing.placeRelationshipId !== group.id) {
    throw new Error(ALREADY_IN_OTHER_GROUP)
  }

  if (group.type === "composite") {
    const memberPlaces = await deps.places.getByIds(group.members.map((m) => m.placeId))
    const fictionId = memberPlaces[0]?.fictionId
    if (fictionId && place.fictionId !== fictionId) {
      throw new Error("Composite members must belong to the same fiction in v1")
    }
  }

  await deps.relationships.addMember(input.placeRelationshipId, input.placeId)
  return {
    memberPlaceIds: [...group.members.map((m) => m.placeId), input.placeId],
  }
}
