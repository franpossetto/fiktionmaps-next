import type { HuntPlace } from "@/src/hunts/domain/hunt.types"
import type { Place } from "@/src/places/domain/place.entity"

export const DUPLICATE_RADIUS_METERS = 100

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function findDuplicate(
  candidate: HuntPlace,
  existingPlaces: Place[],
): { id: string; name: string; image: string | null } | null {
  if (existingPlaces.length === 0) return null
  if (candidate.lat === null || candidate.lng === null) return null

  const match = existingPlaces.find(
    (p) =>
      haversineMeters(candidate.lat!, candidate.lng!, p.location.lat, p.location.lng) <
      DUPLICATE_RADIUS_METERS,
  )

  return match ? { id: match.id, name: match.name, image: match.image || null } : null
}
