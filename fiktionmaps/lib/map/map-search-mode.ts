import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { isAllFictionsSelected } from "@/lib/map/map-url"

export type MapBarSearchMode = "pick-fiction" | "scoped" | "multi"

export function resolveMapBarSearchMode(
  selectedFictionIds: string[],
  availableFictions: FictionWithMedia[],
): { mode: MapBarSearchMode; singleFictionId: string | null } {
  const allSelected = isAllFictionsSelected(selectedFictionIds, availableFictions)
  const count = allSelected ? availableFictions.length : selectedFictionIds.length

  if (count === 0) {
    return { mode: "pick-fiction", singleFictionId: null }
  }
  if (count === 1) {
    const singleFictionId = allSelected ? availableFictions[0]!.id : selectedFictionIds[0]!
    return { mode: "scoped", singleFictionId }
  }
  return { mode: "multi", singleFictionId: null }
}
