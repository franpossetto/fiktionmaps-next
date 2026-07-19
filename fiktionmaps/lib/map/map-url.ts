import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { isUuidString } from "@/lib/validation/primitives"

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

/** Builds map query string; omits `fiction` when all fictions in the city are selected. */
export function buildMapQueryString(
  citySlug: string,
  fictionIds: string[],
  available: FictionWithMedia[],
  preserve?: { place?: string | null; openSidebar?: string | null },
): string {
  const params = new URLSearchParams()
  params.set("city", citySlug)
  if (fictionIds.length === 0) {
    params.set("fiction", MAP_FICTION_NONE)
  } else if (!isAllFictionsSelected(fictionIds, available)) {
    params.set("fiction", fictionIds.join(","))
  }
  if (preserve?.place) params.set("place", preserve.place)
  if (preserve?.openSidebar) params.set("openSidebar", preserve.openSidebar)
  return params.toString()
}
