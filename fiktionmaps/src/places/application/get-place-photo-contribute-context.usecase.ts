import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export type PlacePhotoContributeContext = {
  placeId: string
  placeName: string
  fictionId: string
  currentImageUrl: string | null
}

export async function getPlacePhotoContributeContextUseCase(
  placeId: string,
  placesRepo: PlacesRepositoryPort,
): Promise<PlacePhotoContributeContext | null> {
  const eligible = await placesRepo.isApprovedActivePlace(placeId)
  if (!eligible) return null

  const place = await placesRepo.getById(placeId, "lg")
  if (!place) return null

  const url = place.image?.trim()
  const currentImageUrl =
    url && !url.endsWith("/placeholder.svg") ? url : null

  return {
    placeId: place.id,
    placeName: place.name,
    fictionId: place.fictionId,
    currentImageUrl,
  }
}
