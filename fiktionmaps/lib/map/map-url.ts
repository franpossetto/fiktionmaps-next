import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { isUuidString } from "@/lib/validation/primitives"
import {
  MAP_MODE_CITY,
  MAP_MODE_WORLD,
  type MapBrowseMode,
} from "@/lib/map/world-map"

/** URL marker when no fiction filter is active (map shows no place pins). */
export const MAP_FICTION_NONE = "none"

export function parseFictionIdsFromUrl(
  param: string | null,
  available: FictionWithMedia[],
): string[] {
  const allIds = available.map((f) => f.id)
  if (param === MAP_FICTION_NONE) return []
  if (!param?.trim()) return allIds
  const ids = param
    .split(",")
    .map((s) => s.trim())
    .filter((id) => isUuidString(id) && available.some((f) => f.id === id))
  return ids.length > 0 ? ids : allIds
}

export function isAllFictionsSelected(
  selected: string[],
  available: FictionWithMedia[],
): boolean {
  if (available.length === 0) return selected.length === 0
  const allIds = available.map((f) => f.id)
  return selected.length === allIds.length && allIds.every((id) => selected.includes(id))
}

export function parseMapBrowseMode(param: string | null): MapBrowseMode {
  return param === MAP_MODE_WORLD ? MAP_MODE_WORLD : MAP_MODE_CITY
}

export function parseMapCameraFromUrl(sp: {
  get(name: string): string | null
}): { lat: number; lng: number; zoom: number } | null {
  const lat = Number(sp.get("lat"))
  const lng = Number(sp.get("lng"))
  const zoom = Number(sp.get("z"))
  if (![lat, lng, zoom].every((n) => Number.isFinite(n))) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  if (zoom < 0 || zoom > 22) return null
  return { lat, lng, zoom }
}

type MapUrlPreserve = { place?: string | null; openSidebar?: string | null }

function applyPreserve(params: URLSearchParams, preserve?: MapUrlPreserve) {
  if (preserve?.place) params.set("place", preserve.place)
  if (preserve?.openSidebar) params.set("openSidebar", preserve.openSidebar)
}

/** Builds map query string; omits `fiction` when all fictions in the city are selected. */
export function buildMapQueryString(
  citySlug: string,
  fictionIds: string[],
  available: FictionWithMedia[],
  preserve?: MapUrlPreserve,
): string {
  const params = new URLSearchParams()
  params.set("city", citySlug)
  if (fictionIds.length === 0) {
    params.set("fiction", MAP_FICTION_NONE)
  } else if (!isAllFictionsSelected(fictionIds, available)) {
    params.set("fiction", fictionIds.join(","))
  }
  applyPreserve(params, preserve)
  return params.toString()
}

/** World-mode URL: camera + optional fiction filter (no city shard). */
export function buildWorldMapQueryString(
  camera: { lat: number; lng: number; zoom: number },
  fictionIds?: string[] | null,
  preserve?: MapUrlPreserve,
): string {
  const params = new URLSearchParams()
  params.set("mode", MAP_MODE_WORLD)
  params.set("lat", camera.lat.toFixed(5))
  params.set("lng", camera.lng.toFixed(5))
  params.set("z", camera.zoom.toFixed(2))
  if (fictionIds && fictionIds.length > 0) {
    params.set("fiction", fictionIds.join(","))
  }
  applyPreserve(params, preserve)
  return params.toString()
}
