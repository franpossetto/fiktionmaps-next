import type { Place } from "@/src/places/domain/place.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

/** Public fiction detail: approved + active places only. */
export async function getFictionPlacesUseCase(
  fictionId: string,
  repo: PlacesRepositoryPort
): Promise<Place[]> {
  return repo.listApprovedByFictionId(fictionId)
}
