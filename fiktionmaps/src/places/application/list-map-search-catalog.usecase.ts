import type {
  MapSearchCatalog,
  MapSearchCatalogCityRef,
  MapSearchCatalogFictionRef,
} from "@/src/places/domain/map-search-catalog.entity"
import type { MapFictionCitySearchEntry } from "@/src/places/domain/map-fiction-city-pair.entity"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export type ListMapSearchCatalogDeps = {
  placesRepo: PlacesRepositoryPort
  getActiveFictions: () => Promise<MapSearchCatalogFictionRef[]>
  getAllCities: () => Promise<MapSearchCatalogCityRef[]>
}

export async function listMapSearchCatalogUseCase(
  deps: ListMapSearchCatalogDeps,
): Promise<MapSearchCatalog> {
  const [pairKeys, fictions, cities, cityIdsWithPlaces] = await Promise.all([
    deps.placesRepo.listDistinctFictionCityPairs(),
    deps.getActiveFictions(),
    deps.getAllCities(),
    deps.placesRepo.listCityIdsWithPlaces(),
  ])

  const fictionById = new Map(fictions.map((f) => [f.id, f]))
  const cityById = new Map(cities.map((c) => [c.id, c]))
  const withPlaces = new Set(cityIdsWithPlaces)
  const pairSeen = new Set<string>()
  const fictionCityPairs: MapFictionCitySearchEntry[] = []

  for (const { fictionId, cityId } of pairKeys) {
    const key = `${fictionId}:${cityId}`
    if (pairSeen.has(key)) continue
    pairSeen.add(key)

    const fiction = fictionById.get(fictionId)
    const city = cityById.get(cityId)
    if (!fiction?.active || !city) continue

    fictionCityPairs.push({
      fictionId,
      cityId,
      fictionTitle: fiction.title,
      cityName: city.name,
      country: city.country,
      coverImage:
        fiction.coverImageThumb?.trim() ||
        fiction.coverImage?.trim() ||
        fiction.coverImageLarge?.trim() ||
        null,
    })
  }

  fictionCityPairs.sort((a, b) => {
    const byTitle = a.fictionTitle.localeCompare(b.fictionTitle, undefined, { sensitivity: "base" })
    if (byTitle !== 0) return byTitle
    return a.cityName.localeCompare(b.cityName, undefined, { sensitivity: "base" })
  })

  const citiesWithPlaces = cities
    .filter((c) => withPlaces.has(c.id))
    .map((c) => ({ cityId: c.id, cityName: c.name, country: c.country }))
    .sort((a, b) => a.cityName.localeCompare(b.cityName, undefined, { sensitivity: "base" }))

  return { fictionCityPairs, citiesWithPlaces }
}
