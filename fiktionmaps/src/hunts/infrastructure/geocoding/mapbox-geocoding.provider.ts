import type { HuntGeocodingPort, HuntGeocodingResult } from "@/src/hunts/domain/geocoding.port"

const BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places"
const TIMEOUT_MS = 8_000

type MapboxFeature = {
  center: [number, number]
  place_name: string
}

export class MapboxGeocodingProvider implements HuntGeocodingPort {
  readonly name = "mapbox"

  async geocode(query: string): Promise<HuntGeocodingResult | null> {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
    if (!token) {
      console.warn("[hunt/geocode/mapbox] NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN not set")
      return null
    }

    const params = new URLSearchParams({
      access_token: token,
      types: "address,poi",
      limit: "1",
    })
    const url = `${BASE_URL}/${encodeURIComponent(query)}.json?${params}`

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!res.ok) {
        console.warn(`[hunt/geocode/mapbox] "${query}" → HTTP ${res.status}`)
        return null
      }

      const data = (await res.json()) as { features?: MapboxFeature[] }
      const feature = data.features?.[0]
      if (!feature) {
        console.warn(`[hunt/geocode/mapbox] "${query}" → no results`)
        return null
      }

      const [lng, lat] = feature.center
      console.info(`[hunt/geocode/mapbox] "${query}" → ${feature.place_name}`)

      return {
        lat,
        lng,
        formattedAddress: feature.place_name,
        provider: "mapbox",
      }
    } catch (err) {
      console.error(`[hunt/geocode/mapbox] "${query}" failed:`, err)
      return null
    }
  }
}
