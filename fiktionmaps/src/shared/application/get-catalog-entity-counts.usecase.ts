import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export type CatalogEntityCounts = {
  fictionCount: number
  cityCount: number
  placeCount: number
}

export async function getCatalogEntityCountsUseCase(deps: {
  fictions: FictionsRepositoryPort
  cities: CitiesRepositoryPort
  places: PlacesRepositoryPort
}): Promise<CatalogEntityCounts> {
  const [fictionCount, cityCount, placeCount] = await Promise.all([
    deps.fictions.countApprovedActive(),
    deps.cities.countAll(),
    deps.places.countApprovedActive(),
  ])
  return { fictionCount, cityCount, placeCount }
}
