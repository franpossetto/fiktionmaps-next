/**
 * Client-side cache + in-flight dedupe for map city payloads.
 * Lets city switches reuse data instantly and share work with hover prefetch.
 */

import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { getCityFictionsAction } from "@/src/cities/infrastructure/next/city.actions"
import { getCityPlacesAction } from "@/src/places/infrastructure/next/place.actions"

export type CityMapData = {
  fictions: FictionWithMedia[]
  places: Place[]
}

type CityMapDataPartial = {
  fictions?: FictionWithMedia[]
  places?: Place[]
}

const cache = new Map<string, CityMapDataPartial>()
const placesInflight = new Map<string, Promise<Place[]>>()
const fictionsInflight = new Map<string, Promise<FictionWithMedia[]>>()

function patchCache(cityId: string, partial: CityMapDataPartial) {
  const prev = cache.get(cityId) ?? {}
  cache.set(cityId, { ...prev, ...partial })
}

export function getCachedCityMapData(cityId: string): CityMapData | null {
  const entry = cache.get(cityId)
  if (!entry?.fictions || !entry?.places) return null
  return { fictions: entry.fictions, places: entry.places }
}

export function getCachedCityPlaces(cityId: string): Place[] | null {
  return cache.get(cityId)?.places ?? null
}

export function getCachedCityFictions(cityId: string): FictionWithMedia[] | null {
  return cache.get(cityId)?.fictions ?? null
}

export function loadCityPlaces(cityId: string): Promise<Place[]> {
  const cached = getCachedCityPlaces(cityId)
  if (cached) return Promise.resolve(cached)
  const inflight = placesInflight.get(cityId)
  if (inflight) return inflight

  const promise = getCityPlacesAction(cityId)
    .then((places) => {
      patchCache(cityId, { places })
      placesInflight.delete(cityId)
      return places
    })
    .catch((error) => {
      placesInflight.delete(cityId)
      throw error
    })
  placesInflight.set(cityId, promise)
  return promise
}

export function loadCityFictions(cityId: string): Promise<FictionWithMedia[]> {
  const cached = getCachedCityFictions(cityId)
  if (cached) return Promise.resolve(cached)
  const inflight = fictionsInflight.get(cityId)
  if (inflight) return inflight

  const promise = getCityFictionsAction(cityId)
    .then((fictions) => {
      patchCache(cityId, { fictions })
      fictionsInflight.delete(cityId)
      return fictions
    })
    .catch((error) => {
      fictionsInflight.delete(cityId)
      throw error
    })
  fictionsInflight.set(cityId, promise)
  return promise
}

/** Warm cache on city-row hover so a click can paint from memory. */
export function prefetchCityMapData(cityId: string): void {
  void loadCityPlaces(cityId).catch(() => {})
  void loadCityFictions(cityId).catch(() => {})
}
