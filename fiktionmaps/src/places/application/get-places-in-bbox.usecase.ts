import type { MapBbox } from "@/lib/validation/map-query"
import type { Place } from "@/src/places/domain/place.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function getPlacesInBboxUseCase(
  fictionIds: string[],
  bbox: MapBbox,
  repo: PlacesRepositoryPort,
): Promise<Place[]> {
  return repo.getByBboxAndFictionIds(fictionIds, bbox)
}
