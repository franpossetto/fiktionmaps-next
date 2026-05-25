import { unstable_cache } from "next/cache"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import { getIsUserStaff } from "@/src/users/infrastructure/next/user.queries"
import { isUuidString } from "@/lib/validation/primitives"
import type { MapBbox } from "@/lib/validation/map-query"
import { createPlacesSupabaseAdapter } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { listAllPlacesUseCase } from "@/src/places/application/list-all-places.usecase"
import { getPlaceCountsByFictionIdsUseCase } from "@/src/places/application/get-place-counts-by-fiction-ids.usecase"
import { getPlaceByIdUseCase } from "@/src/places/application/get-place-by-id.usecase"
import { resolvePlaceForFictionPathUseCase } from "@/src/places/application/resolve-place-for-fiction-path.usecase"
import { listActivePlacesForSitemapUseCase } from "@/src/places/application/list-active-places-for-sitemap.usecase"
import { getFictionPlacesUseCase } from "@/src/places/application/get-fiction-places.usecase"
import { getCityPlacesUseCase } from "@/src/places/application/get-city-places.usecase"
import { getPlacesInBboxUseCase } from "@/src/places/application/get-places-in-bbox.usecase"
import { listCityIdsWithPlacesUseCase } from "@/src/places/application/list-city-ids-with-places.usecase"
import { listMapSearchCatalogUseCase } from "@/src/places/application/list-map-search-catalog.usecase"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import type { MapSearchCatalog } from "@/src/places/domain/map-search-catalog.entity"
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
    CacheKeys.place(`${placeId}:v2`),
    { ...CacheConfig.medium, tags: ["places", `place-${placeId}`] }
  )()
}

export function getPlaceLocationByIdDetailCached(placeId: string) {
  return unstable_cache(
    () => getPlaceByIdUseCase(placeId, anonRepo, "lg"),
    CacheKeys.place(`${placeId}:detail-lg:v2`),
    { ...CacheConfig.medium, tags: ["places", `place-${placeId}`] }
  )()
}

export function resolvePlaceForFictionPathCached(fictionId: string, segment: string) {
  const key = `${fictionId}:${segment.trim()}`
  return unstable_cache(
    () => resolvePlaceForFictionPathUseCase(fictionId, segment, anonRepo, "lg"),
    CacheKeys.place(`resolve:${key}:lg`),
    { ...CacheConfig.medium, tags: ["places", `fiction-${fictionId}`] },
  )()
}

export function listActivePlacesForSitemapCached() {
  return unstable_cache(
    () => listActivePlacesForSitemapUseCase(anonRepo),
    CacheKeys.place("sitemap-active"),
    { ...CacheConfig.long, tags: ["places", "fictions", "sitemap"] },
  )()
}

/** Respects staff RLS (e.g. pending places). Caller should only use on staff-only pages. */
export async function getPlaceLocationByIdForStaffSession(placeId: string): Promise<Place | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  const staff = await getIsUserStaff(user.id)
  if (!staff) return null
  const repo = createPlacesSupabaseAdapter(async () => supabase)
  return getPlaceByIdUseCase(placeId, repo, "lg")
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

export function listCityIdsWithPlacesCached() {
  return unstable_cache(
    () => listCityIdsWithPlacesUseCase(anonRepo),
    CacheKeys.place("city-ids-with-places"),
    { ...CacheConfig.long, tags: ["places", "cities"] }
  )()
}

export function listMapSearchCatalogCached(): Promise<MapSearchCatalog> {
  return unstable_cache(
    () =>
      listMapSearchCatalogUseCase({
        placesRepo: anonRepo,
        getActiveFictions: getActiveFictionsCached,
        getAllCities: getAllCitiesCached,
      }),
    CacheKeys.place("map-search-catalog"),
    { ...CacheConfig.long, tags: ["places", "cities", "fictions"] },
  )()
}

export async function listPlacesInBboxForFictionIds(
  rawFictionIds: string[],
  bbox: MapBbox,
): Promise<Place[]> {
  const fictionIds = rawFictionIds.filter(isUuidString)
  if (fictionIds.length === 0) return []

  const fictionKey = fictionIds.slice().sort().join(",")
  const bboxKey = [bbox.west, bbox.south, bbox.east, bbox.north]
    .map((n) => n.toFixed(4))
    .join(",")

  return unstable_cache(
    () => getPlacesInBboxUseCase(fictionIds, bbox, anonRepo),
    CacheKeys.place(`bbox:${fictionKey}:${bboxKey}`),
    { ...CacheConfig.short, tags: ["places"] },
  )()
}
