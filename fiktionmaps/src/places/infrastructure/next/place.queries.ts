import { unstable_cache } from "next/cache"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import { getIsUserStaff } from "@/src/users/infrastructure/next/user.queries"
import { isUuidString } from "@/lib/validation/primitives"
import type { MapBbox } from "@/lib/validation/map-query"
import { createPlacesSupabaseAdapter } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { listAllPlacesUseCase } from "@/src/places/application/list-all-places.usecase"
import { getPlaceCountsByFictionIdsUseCase } from "@/src/places/application/get-place-counts-by-fiction-ids.usecase"
import { getPlaceByIdUseCase } from "@/src/places/application/get-place-by-id.usecase"
import { getPlacesByIdsUseCase } from "@/src/places/application/get-places-by-ids.usecase"
import { resolvePlaceForFictionPathUseCase } from "@/src/places/application/resolve-place-for-fiction-path.usecase"
import { listActivePlacesForSitemapUseCase } from "@/src/places/application/list-active-places-for-sitemap.usecase"
import { getFictionPlacesUseCase } from "@/src/places/application/get-fiction-places.usecase"
import { getCityPlacesUseCase } from "@/src/places/application/get-city-places.usecase"
import { getPlacesInBboxUseCase } from "@/src/places/application/get-places-in-bbox.usecase"
import { listMapClustersInBboxUseCase } from "@/src/places/application/list-map-clusters-in-bbox.usecase"
import { listMapPlacesInBboxUseCase } from "@/src/places/application/list-map-places-in-bbox.usecase"
import { listCityIdsWithPlacesUseCase } from "@/src/places/application/list-city-ids-with-places.usecase"
import { listMapSearchCatalogUseCase } from "@/src/places/application/list-map-search-catalog.usecase"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import type { MapSearchCatalog } from "@/src/places/domain/map-search-catalog.entity"
import type { MapCluster } from "@/src/places/domain/map-cluster.entity"
import type { Place } from "@/src/places/domain/place.entity"
import {
  fictionIdsCacheKey,
  gridDegForZoom,
  normalizeMapClusters,
  roundBbox,
  splitBboxAntimeridian,
  WORLD_MAX_CLUSTERS,
  WORLD_MAX_PLACES,
} from "@/lib/map/world-map"
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

/** Batch place fetch for scene up-next / related places (1 query). */
export function getPlaceLocationsByIdsCached(placeIds: string[]): Promise<Place[]> {
  const unique = [...new Set(placeIds.filter(Boolean))]
  if (unique.length === 0) return Promise.resolve([])
  const key = unique.slice().sort().join(",")
  return unstable_cache(
    () => getPlacesByIdsUseCase(unique, anonRepo, "sm"),
    CacheKeys.place(`batch:${key}:sm`),
    { ...CacheConfig.medium, tags: ["places"] },
  )()
}

export function getPlaceLocationByIdDetailCached(placeId: string) {
  return unstable_cache(
    () => getPlaceByIdUseCase(placeId, anonRepo, "lg"),
    CacheKeys.place(`${placeId}:detail-lg:v2`),
    { ...CacheConfig.medium, tags: ["places", `place-${placeId}`] }
  )()
}

/**
 * Public place path resolve. Hits are cached; misses are not (throw-inside-cache)
 * so a transient null cannot poison the URL for the whole revalidate window.
 */
export async function resolvePlaceForFictionPathCached(fictionId: string, segment: string) {
  const key = `${fictionId}:${segment.trim()}`
  try {
    return await unstable_cache(
      async () => {
        const place = await resolvePlaceForFictionPathUseCase(fictionId, segment, anonRepo, "lg")
        if (!place) throw new Error("PLACE_RESOLVE_MISS")
        return place
      },
      CacheKeys.place(`resolve:${key}:lg:active:v2`),
      { ...CacheConfig.medium, tags: ["places", `fiction-${fictionId}`] },
    )()
  } catch (e) {
    if (e instanceof Error && e.message === "PLACE_RESOLVE_MISS") return null
    throw e
  }
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
    CacheKeys.fiction(`places:${fictionId}:approved`),
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

function normalizeFictionIds(raw: string[] | null | undefined): string[] | null {
  if (!raw?.length) return null
  const ids = raw.filter(isUuidString)
  return ids.length > 0 ? ids : null
}

/** Free-world place pins (detail zoom). Merges antimeridian splits; hard-capped. */
export async function listMapPlacesInBboxCached(
  bbox: MapBbox,
  rawFictionIds?: string[] | null,
  limit: number = WORLD_MAX_PLACES,
): Promise<Place[]> {
  const fictionIds = normalizeFictionIds(rawFictionIds)
  const parts = splitBboxAntimeridian(bbox)
  const capped = Math.max(1, Math.min(limit, WORLD_MAX_PLACES))
  const fictionKey = fictionIdsCacheKey(fictionIds)

  const fetchPart = (part: MapBbox) => {
    const rounded = roundBbox(part, 3)
    const bboxKey = [rounded.west, rounded.south, rounded.east, rounded.north].join(",")
    return unstable_cache(
      () =>
        listMapPlacesInBboxUseCase(
          { bbox: part, fictionIds, limit: capped },
          anonRepo,
        ),
      CacheKeys.place(`world-places:${fictionKey}:${bboxKey}:${capped}`),
      { ...CacheConfig.short, tags: ["places"] },
    )()
  }

  if (parts.length === 1) return fetchPart(parts[0])

  const chunks = await Promise.all(parts.map(fetchPart))
  const seen = new Set<string>()
  const out: Place[] = []
  for (const chunk of chunks) {
    for (const p of chunk) {
      if (seen.has(p.id)) continue
      seen.add(p.id)
      out.push(p)
      if (out.length >= capped) return out
    }
  }
  return out
}

/** Free-world server clusters (low zoom). */
export async function listMapClustersInBboxCached(
  bbox: MapBbox,
  zoom: number,
  rawFictionIds?: string[] | null,
  maxClusters: number = WORLD_MAX_CLUSTERS,
): Promise<MapCluster[]> {
  const fictionIds = normalizeFictionIds(rawFictionIds)
  const gridDeg = gridDegForZoom(zoom)
  const parts = splitBboxAntimeridian(bbox)
  const capped = Math.max(1, Math.min(maxClusters, WORLD_MAX_CLUSTERS))
  const fictionKey = fictionIdsCacheKey(fictionIds)
  const zBand = Math.floor(zoom)

  const fetchPart = (part: MapBbox) => {
    const rounded = roundBbox(part, 2)
    const bboxKey = [rounded.west, rounded.south, rounded.east, rounded.north].join(",")
    return unstable_cache(
      () =>
        listMapClustersInBboxUseCase(
          { bbox: part, gridDeg, fictionIds, maxClusters: capped },
          anonRepo,
        ),
      // v4: fictionCovers dropped from the hot path (no consumer yet) — counts-only aggregates.
      CacheKeys.place(`world-clusters:v4:${fictionKey}:${bboxKey}:${gridDeg}:${capped}:z${zBand}`),
      { ...CacheConfig.medium, tags: ["places"] },
    )()
  }

  if (parts.length === 1) return normalizeMapClusters(await fetchPart(parts[0]))

  const chunks = await Promise.all(parts.map(fetchPart))
  const byId = new Map<string, MapCluster>()
  for (const chunk of chunks) {
    for (const c of normalizeMapClusters(chunk)) {
      const prev = byId.get(c.id)
      if (!prev) {
        byId.set(c.id, c)
        continue
      }
      const total = prev.count + c.count
      const keep = c.count >= prev.count ? c : prev
      byId.set(c.id, {
        ...keep,
        count: total,
        cityCount: Math.max(prev.cityCount, c.cityCount),
        fictionTotal: Math.max(prev.fictionTotal, c.fictionTotal),
        lat: (prev.lat * prev.count + c.lat * c.count) / total,
        lng: (prev.lng * prev.count + c.lng * c.count) / total,
        fictionCovers: keep.fictionCovers ?? [],
      })
    }
  }
  return normalizeMapClusters(
    [...byId.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, capped),
  )
}
