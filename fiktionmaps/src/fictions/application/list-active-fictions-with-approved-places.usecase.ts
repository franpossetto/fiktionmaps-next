import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import { getActiveFictionsUseCase } from "@/src/fictions/application/get-active-fictions.usecase"

export async function listActiveFictionsWithApprovedPlacesUseCase(
  fictionsRepo: FictionsRepositoryPort,
  placesRepo: PlacesRepositoryPort,
): Promise<FictionWithMedia[]> {
  const [active, fictionIdsWithPlaces] = await Promise.all([
    getActiveFictionsUseCase(fictionsRepo),
    placesRepo.listFictionIdsWithApprovedPlaces(),
  ])
  const withPlaces = new Set(fictionIdsWithPlaces)
  return active.filter((f) => withPlaces.has(f.id))
}
