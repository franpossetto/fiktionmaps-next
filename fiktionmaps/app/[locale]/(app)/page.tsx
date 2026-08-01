import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import {
  getPlaceCountsByFictionIdsCached,
  listCityIdsWithPlacesCached,
  listMapSearchCatalogCached,
} from "@/src/places/infrastructure/next/place.queries"
import { HomeSearch } from "@/components/home/home-search"

type Props = {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  const [cities, fictions, cityIdsWithPlaces, catalog] = await Promise.all([
    getAllCitiesCached(),
    getActiveFictionsCached(),
    listCityIdsWithPlacesCached(),
    listMapSearchCatalogCached(),
  ])

  const placeCounts = await getPlaceCountsByFictionIdsCached(fictions.map((f) => f.id))

  // First city (by catalog sort) with places for each fiction — map deep links need a city shard.
  const citySlugById = new Map(cities.map((c) => [c.id, c.slug]))
  const fictionMapCitySlugs: Record<string, string> = {}
  for (const pair of catalog.fictionCityPairs) {
    if (fictionMapCitySlugs[pair.fictionId]) continue
    const slug = citySlugById.get(pair.cityId)
    if (slug) fictionMapCitySlugs[pair.fictionId] = slug
  }

  return (
    <div className="h-full overflow-y-auto">
      <HomeSearch
        cities={cities}
        fictions={fictions}
        placeCounts={placeCounts}
        cityIdsWithPlaces={cityIdsWithPlaces}
        fictionMapCitySlugs={fictionMapCitySlugs}
        locale={locale}
      />
    </div>
  )
}
