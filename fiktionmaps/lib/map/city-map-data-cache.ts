"use client"

/**
 * Client-side cache + in-flight dedupe for map city payloads.
 * Lets city switches reuse data instantly and share work with hover prefetch.
 */

import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { getCityFictionsAction } from "@/src/cities/infrastructure/next/city.actions"
import { getCityPlacesAction } from "@/src/places/infrastructure/next/place.actions"

function isBenignFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("aborted") ||
    error.name === "AbortError"
  )
}

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

/** Seed from RSC so the map client skips the first places/fictions round-trips. */
export function seedCityMapData(cityId: string, data: CityMapData): void {
  patchCache(cityId, data)
}

export function loadCityPlaces(cityId: string): Promise<Place[]> {
  const cached = getCachedCityPlaces(cityId)
  if (cached) return Promise.resolve(cached)
  const inflight = placesInflight.get(cityId)
  if (inflight) return inflight

  const promise = getCityPlacesAction(cityId)
    .then((places) => {
      patchCache(cityId, { places })
      return places
    })
    .catch((error) => {
      if (!isBenignFetchError(error)) console.warn("[loadCityPlaces]", cityId, error)
      return [] as Place[]
    })
    .finally(() => {
      placesInflight.delete(cityId)
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
      return fictions
    })
    .catch((error) => {
      if (!isBenignFetchError(error)) console.warn("[loadCityFictions]", cityId, error)
      return [] as FictionWithMedia[]
    })
    .finally(() => {
      fictionsInflight.delete(cityId)
    })
  fictionsInflight.set(cityId, promise)
  return promise
}

/** Warm cache on city-row hover so a click can paint from memory. */
export function prefetchCityMapData(cityId: string): void {
  void loadCityPlaces(cityId)
  void loadCityFictions(cityId)
}
