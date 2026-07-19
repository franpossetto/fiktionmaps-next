import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getCityFictionsCached } from "@/src/cities/infrastructure/next/city.queries"
import {
  getCityPlacesCached,
  listCityIdsWithPlacesCached,
} from "@/src/places/infrastructure/next/place.queries"
import type { City } from "@/src/cities/domain/city.entity"
import { MapPageClient, type MapPageInitialData } from "./map-page-client"

type Props = {
  searchParams: Promise<{ city?: string }>
}

function pickInitialCity(
  cities: City[],
  cityIdsWithPlaces: string[],
  cityFromUrl: string | undefined,
): City | null {
  if (cities.length === 0) return null
  if (cityFromUrl?.trim()) {
    const slug = cityFromUrl.trim().toLowerCase()
    const fromUrl = cities.find((c) => c.slug === slug)
    if (fromUrl) return fromUrl
  }
  const withPlaces = cities.filter((c) => cityIdsWithPlaces.includes(c.id))
  const pool = withPlaces.length > 0 ? withPlaces : cities
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

export default async function MapPage({ searchParams }: Props) {
  const { city: cityParam } = await searchParams

  const [cities, cityIdsWithPlaces] = await Promise.all([
    getAllCitiesCached(),
    listCityIdsWithPlacesCached(),
  ])

  const initialCity = pickInitialCity(cities, cityIdsWithPlaces, cityParam)

  const [initialPlaces, initialFictions] = initialCity
    ? await Promise.all([
        getCityPlacesCached(initialCity.id),
        getCityFictionsCached(initialCity.id),
      ])
    : [[], []]

  const initial: MapPageInitialData = {
    cities,
    cityIdsWithPlaces,
    initialCity,
    initialPlaces,
    initialFictions,
  }

  return <MapPageClient initial={initial} />
}
