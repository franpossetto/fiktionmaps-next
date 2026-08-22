import type {
  PlaceRelationship,
  PlaceRelationshipType,
  PlaceRelationshipWithPlaces,
} from "./place-relationship.entity"

export type CreatePlaceRelationshipRepoInput = {
  type: PlaceRelationshipType
  name: string
  slug: string
  placeIds: string[]
}

export interface PlaceRelationshipsRepositoryPort {
  getById(id: string): Promise<PlaceRelationship | null>
  getByPlaceId(placeId: string): Promise<PlaceRelationshipWithPlaces[]>
  /** Composite groups whose members intersect the given place ids (batch, 2 queries). */
  getCompositeGroupsForPlaceIds(placeIds: string[]): Promise<PlaceRelationship[]>
  getMembership(
    placeId: string,
    type: PlaceRelationshipType,
  ): Promise<{ placeRelationshipId: string } | null>
  listSlugs(): Promise<string[]>
  create(input: CreatePlaceRelationshipRepoInput): Promise<PlaceRelationship>
  addMember(placeRelationshipId: string, placeId: string): Promise<void>
  removeMember(placeRelationshipId: string, placeId: string): Promise<void>
  delete(placeRelationshipId: string): Promise<void>
}
