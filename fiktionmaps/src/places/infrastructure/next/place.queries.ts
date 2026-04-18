import { unstable_cache } from "next/cache"
import { createAnonymousClient } from "@/lib/supabase/server"
import { isUuidString } from "@/lib/validation/primitives"
import type { MapBbox } from "@/lib/validation/map-query"
import { createPlacesSupabaseAdapter } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { listAllLocationsUseCase } from "@/src/places/application/list-all-locations.usecase"
import { getPlaceByIdUseCase } from "@/src/places/application/get-place-by-id.usecase"
import { getFictionLocationsUseCase } from "@/src/places/application/get-fiction-locations.usecase"
import { getCityLocationsUseCase } from "@/src/places/application/get-city-locations.usecase"
import { getPlacesInBboxUseCase } from "@/src/places/application/get-places-in-bbox.usecase"
import type { Location } from "@/src/locations/domain/location.entity"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const anon = () => Promise.resolve(createAnonymousClient())
const anonRepo = createPlacesSupabaseAdapter(anon)

export function getAllPlacesCached() {
  return unstable_cache(
    () => listAllLocationsUseCase(anonRepo),
    ["places", "all"],
    { ...CacheConfig.medium, tags: ["places"] }
  )()
}

export function getPlaceLocationByIdCached(placeId: string) {
  return unstable_cache(
    () => getPlaceByIdUseCase(placeId, anonRepo),
    CacheKeys.place(placeId),
    { ...CacheConfig.medium, tags: ["places", `place-${placeId}`] }
  )()
}

export function getFictionLocationsCached(fictionId: string) {
  return unstable_cache(
    () => getFictionLocationsUseCase(fictionId, anonRepo),
    CacheKeys.fiction(`locations:${fictionId}`),
    { ...CacheConfig.long, tags: ["places", "fictions", `fiction-${fictionId}`] }
  )()
}

export function getCityLocationsCached(cityId: string) {
  return unstable_cache(
    () => getCityLocationsUseCase(cityId, anonRepo),
    CacheKeys.city(`locations:${cityId}`),
    { ...CacheConfig.long, tags: ["places", "cities", `city-${cityId}`] }
  )()
}

/** Map pins in viewport for selected fictions (not cached — bbox changes with pan/zoom). */
export async function listPlacesInBboxForFictionIds(
  rawFictionIds: string[],
  bbox: MapBbox,
): Promise<Location[]> {
  const fictionIds = rawFictionIds.filter(isUuidString)
  if (fictionIds.length === 0) return []
  return getPlacesInBboxUseCase(fictionIds, bbox, anonRepo)
}
