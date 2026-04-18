import type { City } from "@/src/cities/domain/city.entity"
import type { Location } from "@/src/locations/domain/location.entity"

interface GetFictionCitiesDeps {
  locationsRepo: {
    getByFictionId(fictionId: string): Promise<Location[]>
  }
  citiesRepo: {
    getAll(): Promise<City[]>
  }
}

export async function getFictionCitiesUseCase(
  fictionId: string,
  deps: GetFictionCitiesDeps
): Promise<City[]> {
  const locations = await deps.locationsRepo.getByFictionId(fictionId)
  const cityIds = [...new Set(locations.map((l) => l.cityId))]
  const allCities = await deps.citiesRepo.getAll()
  return allCities.filter((c) => cityIds.includes(c.id))
}
