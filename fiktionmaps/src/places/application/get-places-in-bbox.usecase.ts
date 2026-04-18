import type { MapBbox } from "@/lib/validation/map-query"
import type { Location } from "@/src/locations/domain/location.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function getPlacesInBboxUseCase(
  fictionIds: string[],
  bbox: MapBbox,
  repo: PlacesRepositoryPort,
): Promise<Location[]> {
  return repo.getByBboxAndFictionIds(fictionIds, bbox)
}
