import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export async function getPlaceCountsByFictionIdsUseCase(
  fictionIds: string[],
  repo: PlacesRepositoryPort,
): Promise<Record<string, number>> {
  if (fictionIds.length === 0) return {}
  return repo.getCountsByFictionIds(fictionIds)
}
