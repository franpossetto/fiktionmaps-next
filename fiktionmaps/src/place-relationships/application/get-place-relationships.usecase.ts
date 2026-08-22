import type { PlaceRelationshipsRepositoryPort } from "@/src/place-relationships/domain/place-relationship.repository"
import type { PlaceRelationshipWithPlaces } from "@/src/place-relationships/domain/place-relationship.entity"

export async function getPlaceRelationshipsUseCase(
  placeId: string,
  repo: PlaceRelationshipsRepositoryPort,
): Promise<PlaceRelationshipWithPlaces[]> {
  return repo.getByPlaceId(placeId)
}
