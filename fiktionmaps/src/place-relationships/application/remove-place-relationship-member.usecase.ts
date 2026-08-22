import type { RemovePlaceRelationshipMemberInput } from "@/src/place-relationships/domain/place-relationship.schemas"
import type { PlaceRelationshipsRepositoryPort } from "@/src/place-relationships/domain/place-relationship.repository"

/**
 * Removes a member. If fewer than 2 members remain, the group is deleted
 * (DB trigger also prunes singletons after CASCADE deletes).
 */
export async function removePlaceRelationshipMemberUseCase(
  input: RemovePlaceRelationshipMemberInput,
  repo: PlaceRelationshipsRepositoryPort,
): Promise<{
  deletedGroup: boolean
  affectedPlaceIds: string[]
}> {
  const group = await repo.getById(input.placeRelationshipId)
  if (!group) throw new Error("Place relationship not found")

  if (!group.members.some((m) => m.placeId === input.placeId)) {
    throw new Error("Place is not a member of this relationship")
  }

  const affectedPlaceIds = group.members.map((m) => m.placeId)
  const remaining = affectedPlaceIds.filter((id) => id !== input.placeId)

  if (remaining.length < 2) {
    await repo.delete(input.placeRelationshipId)
    return { deletedGroup: true, affectedPlaceIds }
  }

  await repo.removeMember(input.placeRelationshipId, input.placeId)
  return { deletedGroup: false, affectedPlaceIds }
}
