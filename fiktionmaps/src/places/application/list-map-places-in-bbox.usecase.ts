import type { MapBbox } from "@/lib/validation/map-query"
import type { Place } from "@/src/places/domain/place.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export type ListMapPlacesInBboxInput = {
  bbox: MapBbox
  fictionIds?: string[] | null
  limit?: number
}

export async function listMapPlacesInBboxUseCase(
  input: ListMapPlacesInBboxInput,
  repo: PlacesRepositoryPort,
): Promise<Place[]> {
  const { bbox, fictionIds, limit } = input
  const { west, south, east, north } = bbox
  if (![west, south, east, north].every((n) => Number.isFinite(n))) return []
  return repo.getByBbox({
    bbox,
    fictionIds: fictionIds?.length ? fictionIds : null,
    limit,
  })
}
