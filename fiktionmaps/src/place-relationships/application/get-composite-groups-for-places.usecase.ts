import type { PlaceRelationship } from "@/src/place-relationships/domain/place-relationship.entity"
import type { PlaceRelationshipsRepositoryPort } from "@/src/place-relationships/domain/place-relationship.repository"

/** Composite groups covering any of the given places (e.g. places listed under one fiction). */
export async function getCompositeGroupsForPlacesUseCase(
  placeIds: string[],
  repo: Pick<PlaceRelationshipsRepositoryPort, "getCompositeGroupsForPlaceIds">,
): Promise<PlaceRelationship[]> {
  return repo.getCompositeGroupsForPlaceIds(placeIds)
}
