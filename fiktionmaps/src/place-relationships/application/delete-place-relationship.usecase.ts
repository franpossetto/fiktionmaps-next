import type { PlaceRelationshipsRepositoryPort } from "@/src/place-relationships/domain/place-relationship.repository"

export async function deletePlaceRelationshipUseCase(
  placeRelationshipId: string,
  repo: PlaceRelationshipsRepositoryPort,
): Promise<{ memberPlaceIds: string[] }> {
  const group = await repo.getById(placeRelationshipId)
  if (!group) throw new Error("Place relationship not found")

  const memberPlaceIds = group.members.map((m) => m.placeId)
  await repo.delete(placeRelationshipId)
  return { memberPlaceIds }
}
