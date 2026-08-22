import type { z } from "zod"
import { createPlaceUseCase } from "@/src/places/application/create-place.usecase"
import type { fictionRowStatusSchema } from "@/src/fictions/domain/fiction.schemas"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { ClonePlaceToFictionInput } from "@/src/place-relationships/domain/place-relationship.schemas"
import type { PlaceRelationshipsRepositoryPort } from "@/src/place-relationships/domain/place-relationship.repository"
import {
  resolveUniqueRelationshipSlug,
  slugBaseFromRelationshipName,
} from "@/src/place-relationships/domain/place-relationship-slug"

type ClonePlaceToFictionDeps = {
  relationships: PlaceRelationshipsRepositoryPort
  places: PlacesRepositoryPort
  status: z.infer<typeof fictionRowStatusSchema>
  createdBy: string
}

/**
 * Clones location + place into another fiction and attaches a shared relationship.
 * Does not copy asset images — the user uploads a photo afterward.
 * Location/place rows are only inserted on this successful commit (no draft rows).
 */
export async function clonePlaceToFictionUseCase(
  input: ClonePlaceToFictionInput,
  deps: ClonePlaceToFictionDeps,
): Promise<{ placeId: string; placeRelationshipId: string; memberPlaceIds: string[] }> {
  const source = await deps.places.getById(input.sourcePlaceId)
  if (!source) throw new Error("Source place not found")

  if (source.fictionId === input.targetFictionId) {
    throw new Error("Target fiction must be different from the source place fiction")
  }

  const existingShared = await deps.relationships.getMembership(source.id, "shared")

  const created = await createPlaceUseCase(
    {
      fictionId: input.targetFictionId,
      cityId: source.location.cityId,
      locationName: source.location.name,
      placeName: input.placeName,
      formattedAddress: source.location.address,
      latitude: source.location.lat,
      longitude: source.location.lng,
      description: input.description,
      isLandmark: source.location.isLandmark,
      locationType: source.location.locationType ?? null,
      relationKind: input.relationKind,
      shootEnvironment: input.shootEnvironment ?? null,
      streetViewReference: source.location.streetViewReference ?? null,
      status: deps.status,
      created_by: deps.createdBy,
    },
    deps.places,
  )

  if (!created) {
    throw new Error("Failed to create cloned place")
  }

  try {
    if (existingShared) {
      await deps.relationships.addMember(existingShared.placeRelationshipId, created.placeId)
      const group = await deps.relationships.getById(existingShared.placeRelationshipId)
      return {
        placeId: created.placeId,
        placeRelationshipId: existingShared.placeRelationshipId,
        memberPlaceIds: group?.members.map((m) => m.placeId) ?? [
          source.id,
          created.placeId,
        ],
      }
    }

    const groupName = (input.relationshipName ?? input.placeName).trim()
    const existingSlugs = await deps.relationships.listSlugs()
    const slug = resolveUniqueRelationshipSlug(
      slugBaseFromRelationshipName(groupName),
      existingSlugs,
    )

    const group = await deps.relationships.create({
      type: "shared",
      name: groupName,
      slug,
      placeIds: [source.id, created.placeId],
    })

    return {
      placeId: created.placeId,
      placeRelationshipId: group.id,
      memberPlaceIds: group.members.map((m) => m.placeId),
    }
  } catch (err) {
    await deps.places.delete(created.placeId)
    throw err
  }
}
