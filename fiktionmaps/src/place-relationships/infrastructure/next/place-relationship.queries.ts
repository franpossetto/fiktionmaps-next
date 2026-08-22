import { unstable_cache } from "next/cache"
import { getPlaceRelationshipsUseCase } from "@/src/place-relationships/application/get-place-relationships.usecase"
import { getCompositeGroupsForPlacesUseCase } from "@/src/place-relationships/application/get-composite-groups-for-places.usecase"
import type {
  PlaceRelationship,
  PlaceRelationshipWithPlaces,
} from "@/src/place-relationships/domain/place-relationship.entity"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"
import { placeRelationshipsRepoPublic } from "@/src/shared/infrastructure/supabase/anon-repos"

/** Approved relationships for a public place detail page. */
export function getPlaceRelationshipsByPlaceIdCached(
  placeId: string,
): Promise<PlaceRelationshipWithPlaces[]> {
  return unstable_cache(
    () => getPlaceRelationshipsUseCase(placeId, placeRelationshipsRepoPublic),
    ["place-relationships", "place", placeId],
    { ...CacheConfig.medium, tags: ["place-relationships", `place-${placeId}`] },
  )()
}

/** Composite groups among a fiction's places, to cluster them in the places list. */
export function getCompositeGroupsForFictionPlacesCached(
  fictionId: string,
  placeIds: string[],
): Promise<PlaceRelationship[]> {
  const unique = [...new Set(placeIds.filter(Boolean))].sort()
  if (unique.length === 0) return Promise.resolve([])
  return unstable_cache(
    () => getCompositeGroupsForPlacesUseCase(unique, placeRelationshipsRepoPublic),
    ["place-relationships", "composite-for-fiction", fictionId, unique.join(",")],
    { ...CacheConfig.medium, tags: ["place-relationships", `fiction-${fictionId}`] },
  )()
}
