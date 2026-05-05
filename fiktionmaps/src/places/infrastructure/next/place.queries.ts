import { unstable_cache } from "next/cache"
import { createAnonymousClient } from "@/lib/supabase/server"
import { isUuidString } from "@/lib/validation/primitives"
import type { MapBbox } from "@/lib/validation/map-query"
import { createPlacesSupabaseAdapter } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { listAllPlacesUseCase } from "@/src/places/application/list-all-places.usecase"
import { getPlaceCountsByFictionIdsUseCase } from "@/src/places/application/get-place-counts-by-fiction-ids.usecase"
import { getPlaceByIdUseCase } from "@/src/places/application/get-place-by-id.usecase"
import { getFictionPlacesUseCase } from "@/src/places/application/get-fiction-places.usecase"
import { getCityPlacesUseCase } from "@/src/places/application/get-city-places.usecase"
import { getPlacesInBboxUseCase } from "@/src/places/application/get-places-in-bbox.usecase"
import type { Place } from "@/src/places/domain/place.entity"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const anon = () => Promise.resolve(createAnonymousClient())
const anonRepo = createPlacesSupabaseAdapter(anon)

export function getAllPlacesCached() {
  return unstable_cache(
    () => listAllPlacesUseCase(anonRepo),
    ["places", "all"],
    { ...CacheConfig.medium, tags: ["places"] }
  )()
}

export function getPlaceCountsByFictionIdsCached(fictionIds: string[]): Promise<Record<string, number>> {
  if (fictionIds.length === 0) return Promise.resolve({})
  const key = fictionIds.slice().sort().join(",")
  return unstable_cache(
    () => getPlaceCountsByFictionIdsUseCase(fictionIds, anonRepo),
    CacheKeys.place(`counts:${key}`),
    { ...CacheConfig.short, tags: ["places"] }
  )()
}

export function getPlaceLocationByIdCached(placeId: string) {
  return unstable_cache(
    () => getPlaceByIdUseCase(placeId, anonRepo, "sm"),
    CacheKeys.place(placeId),
    { ...CacheConfig.medium, tags: ["places", `place-${placeId}`] }
  )()
}

export function getPlaceLocationByIdDetailCached(placeId: string) {
  return unstable_cache(
    () => getPlaceByIdUseCase(placeId, anonRepo, "lg"),
    CacheKeys.place(`${placeId}:detail-lg`),
    { ...CacheConfig.medium, tags: ["places", `place-${placeId}`] }
  )()
}

export function getFictionPlacesCached(fictionId: string) {
  return unstable_cache(
    () => getFictionPlacesUseCase(fictionId, anonRepo),
    CacheKeys.fiction(`places:${fictionId}`),
    { ...CacheConfig.long, tags: ["places", "fictions", `fiction-${fictionId}`] }
  )()
}

export function getCityPlacesCached(cityId: string) {
  return unstable_cache(
    () => getCityPlacesUseCase(cityId, anonRepo),
    CacheKeys.city(`places:${cityId}`),
    { ...CacheConfig.long, tags: ["places", "cities", `city-${cityId}`] }
  )()
}

export async function listPlacesInBboxForFictionIds(
  rawFictionIds: string[],
  bbox: MapBbox,
): Promise<Place[]> {
  const fictionIds = rawFictionIds.filter(isUuidString)
  if (fictionIds.length === 0) return []
  return getPlacesInBboxUseCase(fictionIds, bbox, anonRepo)
}
