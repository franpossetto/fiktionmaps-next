import type { MapBbox } from "@/lib/validation/map-query"
import type { MapCluster } from "@/src/places/domain/map-cluster.entity"

export const WORLD_MIN_ZOOM = 2
export const WORLD_MAX_ZOOM = 20
/**
 * World inward zoom cap — user must click a cluster to enter the city sandbox.
 * Matches Z_EXIT so world never sits at “city zoom” with only aggregates.
 */
export const WORLD_Z_ENTER = 8
/** City sandbox floor — zoom-out past this exits into world (hysteresis). */
export const WORLD_Z_EXIT = 8
/** Camera zoom when switching to free-world (globe visible, not minimum). */
export const WORLD_OVERVIEW_ZOOM = 3
export const WORLD_MAX_CLUSTERS = 200
export const WORLD_MAX_PLACES = 400
export const WORLD_CLUSTER_MAX_FICTIONS = 5

export const MAP_MODE_WORLD = "world"
export const MAP_MODE_CITY = "city"

export type MapBrowseMode = typeof MAP_MODE_CITY | typeof MAP_MODE_WORLD

/** Grid cell size (degrees) for server aggregates — coarser at lower zoom. */
export function gridDegForZoom(zoom: number): number {
  if (zoom < 4) return 8
  if (zoom < 6) return 4
  if (zoom < 8) return 2
  if (zoom < 10) return 1
  if (zoom < 12) return 0.5
  return 0.25
}

/**
 * One click: enter city only when the bucket is a single city.
 * If several cities share the cluster, zoom in instead.
 */
export function shouldEnterCityFromCluster(cluster: MapCluster): boolean {
  if (!cluster.dominantCityId) return false
  return cluster.cityCount <= 1
}

/** Split bbox that crosses the antimeridian into one or two ranges. */
export function splitBboxAntimeridian(bbox: MapBbox): MapBbox[] {
  if (bbox.west <= bbox.east) return [bbox]
  return [
    { west: bbox.west, south: bbox.south, east: 180, north: bbox.north },
    { west: -180, south: bbox.south, east: bbox.east, north: bbox.north },
  ]
}

/** Round bbox for cache keys / containment checks. */
export function roundBbox(bbox: MapBbox, digits = 2): MapBbox {
  const f = 10 ** digits
  return {
    west: Math.floor(bbox.west * f) / f,
    south: Math.floor(bbox.south * f) / f,
    east: Math.ceil(bbox.east * f) / f,
    north: Math.ceil(bbox.north * f) / f,
  }
}

export function fictionIdsCacheKey(fictionIds: string[] | null): string {
  if (!fictionIds || fictionIds.length === 0) return "all"
  return fictionIds.slice().sort().join(",")
}

/** Rough viewport for kicking off world fetch before Mapbox reports bounds. */
export function approxBboxFromCenter(
  lat: number,
  lng: number,
  zoom: number,
): MapBbox {
  const span = 360 / 2 ** Math.max(zoom, 1)
  return {
    west: lng - span,
    east: lng + span,
    south: Math.max(-85, lat - span / 2),
    north: Math.min(85, lat + span / 2),
  }
}

/** True when `inner` is fully inside `outer` (no antimeridian). */
export function bboxContainedIn(inner: MapBbox, outer: MapBbox): boolean {
  if (outer.west > outer.east || inner.west > inner.east) return false
  return (
    inner.west >= outer.west &&
    inner.east <= outer.east &&
    inner.south >= outer.south &&
    inner.north <= outer.north
  )
}

export type WorldClustersCacheEntry = {
  bbox: MapBbox
  gridDeg: number
  clusters: MapCluster[]
}

/** Client LRU: reuse clusters when viewport shrinks inside a prior fetch at same grid. */
export function findCachedWorldClusters(
  cache: WorldClustersCacheEntry[],
  bbox: MapBbox,
  gridDeg: number,
): MapCluster[] | null {
  for (let i = cache.length - 1; i >= 0; i--) {
    const entry = cache[i]
    if (entry.gridDeg !== gridDeg) continue
    if (bboxContainedIn(bbox, entry.bbox)) return entry.clusters
  }
  return null
}

export function pushWorldClustersCache(
  cache: WorldClustersCacheEntry[],
  entry: WorldClustersCacheEntry,
  maxEntries = 8,
): WorldClustersCacheEntry[] {
  const next = cache.filter(
    (e) => !(e.gridDeg === entry.gridDeg && bboxContainedIn(e.bbox, entry.bbox)),
  )
  next.push(entry)
  return next.length > maxEntries ? next.slice(next.length - maxEntries) : next
}

/** Harden clusters from cache / partial RPC / flight serialization. */
export function normalizeMapCluster(raw: Partial<MapCluster> | null | undefined): MapCluster | null {
  if (!raw || typeof raw !== "object") return null
  const lat = Number(raw.lat)
  const lng = Number(raw.lng)
  const count = Number(raw.count)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !(count > 0)) return null
  const covers = Array.isArray(raw.fictionCovers) ? raw.fictionCovers : []
  return {
    id: String(raw.id ?? `${lat}:${lng}`),
    lat,
    lng,
    count,
    cityCount: Number(raw.cityCount) || 0,
    dominantCityId: raw.dominantCityId ? String(raw.dominantCityId) : null,
    dominantShare: Number(raw.dominantShare) || 0,
    fictionTotal: Number(raw.fictionTotal) || 0,
    fictionCovers: covers
      .filter((c) => c && typeof c === "object" && c.fictionId)
      .slice(0, WORLD_CLUSTER_MAX_FICTIONS)
      .map((c) => ({
        fictionId: String(c.fictionId),
        imageUrl: typeof c.imageUrl === "string" && c.imageUrl ? c.imageUrl : "/placeholder.svg",
        title: typeof c.title === "string" ? c.title : null,
      })),
  }
}

export function normalizeMapClusters(raw: unknown): MapCluster[] {
  if (!Array.isArray(raw)) return []
  const out: MapCluster[] = []
  for (const item of raw) {
    const n = normalizeMapCluster(item as Partial<MapCluster>)
    if (n) out.push(n)
  }
  return out
}
