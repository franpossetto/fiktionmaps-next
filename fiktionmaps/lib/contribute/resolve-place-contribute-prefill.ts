import { isUuidString } from "@/lib/validation/primitives"
import type { Place } from "@/src/places/domain/place.entity"
import { getPlaceLocationByIdCached } from "@/src/places/infrastructure/next/place.queries"

export type PlaceContributePrefill = { fictionId: string; place: Place }

/**
 * Shortcut params coming from a place detail page (`?fictionId=&placeId=`).
 * Only trusted when the fiction is in the wizard's own list and owns the place.
 */
export async function resolvePlaceContributePrefill(
  searchParams: { fictionId?: string; placeId?: string },
  allowedFictions: { id: string }[],
): Promise<PlaceContributePrefill | null> {
  const fictionId = searchParams.fictionId?.trim() ?? ""
  const placeId = searchParams.placeId?.trim() ?? ""
  if (!isUuidString(fictionId) || !isUuidString(placeId)) return null
  if (!allowedFictions.some((fiction) => fiction.id === fictionId)) return null
  const place = await getPlaceLocationByIdCached(placeId)
  if (!place || place.fictionId !== fictionId) return null
  return { fictionId, place }
}
