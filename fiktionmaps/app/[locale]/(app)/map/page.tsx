import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getCityFictionsCached } from "@/src/cities/infrastructure/next/city.queries"
import {
  getCityPlacesCached,
  getFictionPlacesCached,
  listCityIdsWithPlacesCached,
} from "@/src/places/infrastructure/next/place.queries"
import type { City } from "@/src/cities/domain/city.entity"
import { isUuidString } from "@/lib/validation/primitives"
import { MapPageClient, type MapPageInitialData } from "./map-page-client"

type Props = {
  searchParams: Promise<{ city?: string; fiction?: string }>
}

function resolveCityFromParam(cities: City[], cityFromUrl: string | undefined): City | undefined {
  if (!cityFromUrl?.trim()) return undefined
  const raw = cityFromUrl.trim()
  const bySlug = cities.find((c) => c.slug === raw.toLowerCase())
  if (bySlug) return bySlug
  // Legacy / mistaken deep links still pass city UUID.
  if (isUuidString(raw)) return cities.find((c) => c.id === raw)
  return undefined
}

async function resolveCityFromFiction(
  cities: City[],
  fictionFromUrl: string | undefined,
): Promise<City | undefined> {
  if (!fictionFromUrl?.trim() || !isUuidString(fictionFromUrl.trim())) return undefined
  const places = await getFictionPlacesCached(fictionFromUrl.trim())
  const cityId = places[0]?.location.cityId
  if (!cityId) return undefined
  return cities.find((c) => c.id === cityId)
}

async function pickInitialCity(
  cities: City[],
  cityIdsWithPlaces: string[],
  cityFromUrl: string | undefined,
  fictionFromUrl: string | undefined,
): Promise<City | null> {
  if (cities.length === 0) return null

  const fromParam = resolveCityFromParam(cities, cityFromUrl)
  if (fromParam) return fromParam

  const fromFiction = await resolveCityFromFiction(cities, fictionFromUrl)
  if (fromFiction) return fromFiction

  const withPlaces = cities.filter((c) => cityIdsWithPlaces.includes(c.id))
  const pool = withPlaces.length > 0 ? withPlaces : cities
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

export default async function MapPage({ searchParams }: Props) {
  const { city: cityParam, fiction: fictionParam } = await searchParams

  const [cities, cityIdsWithPlaces] = await Promise.all([
    getAllCitiesCached(),
    listCityIdsWithPlacesCached(),
  ])

  const initialCity = await pickInitialCity(
    cities,
    cityIdsWithPlaces,
    cityParam,
    fictionParam,
  )

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
