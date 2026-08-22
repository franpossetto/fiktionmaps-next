import type { Place } from "@/src/places/domain/place.entity"
import type { PlaceRelationshipWithPlaces } from "@/src/place-relationships/domain/place-relationship.entity"

export type PlaceRelationshipsActionError = {
  success: false
  error: string
}

export type GetPlaceRelationshipsResult =
  | { success: true; relationships: PlaceRelationshipWithPlaces[] }
  | PlaceRelationshipsActionError

export type CreatePlaceRelationshipResult =
  | { success: true; placeRelationshipId: string }
  | PlaceRelationshipsActionError

export type AddPlaceRelationshipMemberResult =
  | { success: true }
  | PlaceRelationshipsActionError

export type RemovePlaceRelationshipMemberResult =
  | { success: true; deletedGroup: boolean }
  | PlaceRelationshipsActionError

export type DeletePlaceRelationshipResult =
  | { success: true }
  | PlaceRelationshipsActionError

export type ClonePlaceToFictionResult =
  | {
      success: true
      createdPlaceId: string
      placeRelationshipId: string
      places: Place[]
    }
  | PlaceRelationshipsActionError
