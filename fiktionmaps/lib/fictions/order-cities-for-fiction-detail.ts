import type { City } from "@/src/cities/domain/city.entity"
import type { Place } from "@/src/places/domain/place.entity"

/** Cities in order of first appearance in `places`, then any remaining from `cities`. */
export function orderCitiesForFictionDetail(places: Place[], cities: City[]): City[] {
  const byId = new Map(cities.map((c) => [c.id, c]))
  const seen = new Set<string>()
  const ordered: City[] = []
  for (const p of places) {
    const id = p.location.cityId
    if (seen.has(id)) continue
    seen.add(id)
    const c = byId.get(id)
    if (c) ordered.push(c)
  }
  for (const c of cities) {
    if (!seen.has(c.id)) ordered.push(c)
  }
  return ordered
}
