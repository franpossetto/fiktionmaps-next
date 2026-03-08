"use client"

import { useCallback, useState } from "react"
import type { GeocodingAdapter, GeocodingPrediction, GeocodingResult } from "../types"
import { MAPBOX_ACCESS_TOKEN } from "./styles"

const BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places"

export function useMapboxGeocoding(): GeocodingAdapter {
  const [ready] = useState(!!MAPBOX_ACCESS_TOKEN)

  const geocode = useCallback(
    async (address: string): Promise<GeocodingResult | null> => {
      if (!MAPBOX_ACCESS_TOKEN) return null
      try {
        const url = `${BASE_URL}/${encodeURIComponent(address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=address,poi&limit=1`
        const res = await fetch(url)
        if (!res.ok) return null
        const data = await res.json()
        const feature = data.features?.[0]
        if (!feature) return null
        const [lng, lat] = feature.center
        return {
          lat,
          lng,
          formattedAddress: feature.place_name,
          types: feature.place_type,
        }
      } catch {
        return null
      }
    },
    [],
  )

  const autocomplete = useCallback(
    async (input: string): Promise<GeocodingPrediction[]> => {
      if (!MAPBOX_ACCESS_TOKEN || input.trim().length < 3) return []
      try {
        const url = `${BASE_URL}/${encodeURIComponent(input)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&autocomplete=true&types=address,poi&limit=5`
        const res = await fetch(url)
        if (!res.ok) return []
        const data = await res.json()
        return (data.features ?? []).map((f: { id: string; place_name: string; place_type?: string[] }) => ({
          id: f.id,
          description: f.place_name,
          types: f.place_type,
        }))
      } catch {
        return []
      }
    },
    [],
  )

  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<GeocodingResult | null> => {
      if (!MAPBOX_ACCESS_TOKEN) return null
      try {
        const url = `${BASE_URL}/${encodeURIComponent(placeId)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
        const res = await fetch(url)
        if (!res.ok) return null
        const data = await res.json()
        const feature = data.features?.[0]
        if (!feature) return null
        const [lng, lat] = feature.center
        return {
          lat,
          lng,
          formattedAddress: feature.place_name,
          types: feature.place_type,
        }
      } catch {
        return null
      }
    },
    [],
  )

  return { ready, geocode, autocomplete, getPlaceDetails }
}
