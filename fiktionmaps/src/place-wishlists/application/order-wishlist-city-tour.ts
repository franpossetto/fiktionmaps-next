import { haversineDistance } from "@/lib/geo/haversine"

/** Warn when a stop is farther than this from the stay. */
export const WISHLIST_TOUR_FAR_KM = 5
/** Keep these out of the main walking-scale tour. */
export const WISHLIST_TOUR_SPLIT_KM = 8

type Coordish = { lat: number | null; lng: number | null }

function hasCoords<T extends Coordish>(item: T): item is T & { lat: number; lng: number } {
  if (item.lat == null || item.lng == null) return false
  if (item.lat === 0 && item.lng === 0) return false
  return Number.isFinite(item.lat) && Number.isFinite(item.lng)
}

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return haversineDistance(a.lat, a.lng, b.lat, b.lng) / 1000
}

function nearestNeighbor<T extends { lat: number; lng: number }>(
  points: T[],
  start: { lat: number; lng: number },
): T[] {
  const remaining = [...points]
  const ordered: T[] = []
  let current = start
  while (remaining.length > 0) {
    let bestAt = 0
    let bestKm = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const km = kmBetween(current, remaining[i]!)
      if (km < bestKm) {
        bestKm = km
        bestAt = i
      }
    }
    const next = remaining.splice(bestAt, 1)[0]!
    ordered.push(next)
    current = next
  }
  return ordered
}

/**
 * Greedy nearest-neighbor tour. Without `origin`, starts at the northernmost pin.
 * With `origin`, starts from that point and parks stops beyond
 * {@link WISHLIST_TOUR_SPLIT_KM} at the end. Places without coords stay last.
 */
export function orderWishlistCityTour<T extends Coordish>(
  items: T[] = [],
  origin?: { lat: number; lng: number } | null,
): T[] {
  const withCoords = items.filter(hasCoords)
  const without = items.filter((item) => !hasCoords(item))
  if (withCoords.length === 0) return [...without]
  if (withCoords.length === 1) return [...withCoords, ...without]

  if (origin) {
    const nearby: typeof withCoords = []
    const far: typeof withCoords = []
    for (const item of withCoords) {
      if (kmBetween(origin, item) > WISHLIST_TOUR_SPLIT_KM) far.push(item)
      else nearby.push(item)
    }
    return [...nearestNeighbor(nearby, origin), ...nearestNeighbor(far, origin), ...without]
  }

  const remaining = [...withCoords]
  remaining.sort((a, b) => b.lat - a.lat || a.lng - b.lng)
  const start = remaining.shift()!
  return [start, ...nearestNeighbor(remaining, start), ...without]
}

export type WishlistTourStop<T extends Coordish = Coordish> = {
  item: T
  kmFromStay: number | null
  kmFromPrevious: number | null
  far: boolean
  tooFar: boolean
}

export function planWishlistCityTour<T extends Coordish>(
  items: T[],
  origin?: { lat: number; lng: number } | null,
): WishlistTourStop<T>[] {
  const ordered = orderWishlistCityTour(items, origin)
  return ordered.map((item, index) => {
    const prev = [...ordered.slice(0, index)].reverse().find((candidate) => hasCoords(candidate))
    const kmFromStay = origin && hasCoords(item) ? kmBetween(origin, item) : null
    const kmFromPrevious = prev && hasCoords(item) ? kmBetween(prev, item) : null
    const tooFar = kmFromStay != null && kmFromStay > WISHLIST_TOUR_SPLIT_KM
    const far = kmFromStay != null && kmFromStay > WISHLIST_TOUR_FAR_KM
    return { item, kmFromStay, kmFromPrevious, far, tooFar }
  })
}
