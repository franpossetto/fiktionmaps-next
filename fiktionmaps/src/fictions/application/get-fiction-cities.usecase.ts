import type { City } from "@/src/cities/domain/city.entity"
import type { Place } from "@/src/places/domain/place.entity"

interface GetFictionCitiesDeps {
  locationsRepo: {
    getByFictionId(fictionId: string): Promise<Place[]>
  }
  citiesRepo: {
    getAll(): Promise<City[]>
  }
}

export async function getFictionCitiesUseCase(
  fictionId: string,
  deps: GetFictionCitiesDeps
): Promise<City[]> {
  const places = await deps.locationsRepo.getByFictionId(fictionId)
  const cityIds = [...new Set(places.map((p) => p.location.cityId))]
  const allCities = await deps.citiesRepo.getAll()
  return allCities.filter((c) => cityIds.includes(c.id))
}
