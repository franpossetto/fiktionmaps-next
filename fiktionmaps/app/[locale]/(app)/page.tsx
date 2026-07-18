import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getPlaceCountsByFictionIdsCached, listCityIdsWithPlacesCached } from "@/src/places/infrastructure/next/place.queries"
import { HomeSearch } from "@/components/home/home-search"

type Props = {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  const [cities, fictions, cityIdsWithPlaces] = await Promise.all([
    getAllCitiesCached(),
    getActiveFictionsCached(),
    listCityIdsWithPlacesCached(),
  ])

  const placeCounts = await getPlaceCountsByFictionIdsCached(fictions.map((f) => f.id))

  return (
    <div className="h-full overflow-y-auto">
      <HomeSearch
        cities={cities}
        fictions={fictions}
        placeCounts={placeCounts}
        cityIdsWithPlaces={cityIdsWithPlaces}
        locale={locale}
      />
    </div>
  )
}
