import type { HuntGeocodingPort, HuntGeocodingResult } from "@/src/hunts/domain/geocoding.port"

const GEOCODING_API_BASE = "https://maps.googleapis.com/maps/api/geocode/json"
const TIMEOUT_MS = 8_000
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 600

type GeocodingResponse = {
  results: Array<{
    formatted_address: string
    geometry: { location: { lat: number; lng: number } }
  }>
  status: string
  error_message?: string
}

const RETRYABLE_STATUSES = new Set(["REQUEST_DENIED", "OVER_QUERY_LIMIT"])

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class GoogleGeocodingProvider implements HuntGeocodingPort {
  readonly name = "google"

  async geocode(query: string): Promise<HuntGeocodingResult | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()
    if (!apiKey) {
      console.warn("[hunt/geocode/google] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set")
      return null
    }

    const url = `${GEOCODING_API_BASE}?address=${encodeURIComponent(query)}&key=${apiKey}`

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        const data = (await res.json()) as GeocodingResponse

        if (data.status === "OK") {
          const top = data.results[0]
          if (!top) return null

          console.info(`[hunt/geocode/google] "${query}" → ${top.formatted_address}`)

          return {
            lat: top.geometry.location.lat,
            lng: top.geometry.location.lng,
            formattedAddress: top.formatted_address,
            provider: "google",
          }
        }

        if (RETRYABLE_STATUSES.has(data.status) && attempt < MAX_ATTEMPTS) {
          console.warn(
            `[hunt/geocode/google] "${query}" → ${data.status} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying…`,
          )
          await sleep(RETRY_DELAY_MS * attempt)
          continue
        }

        console.warn(`[hunt/geocode/google] "${query}" → status: ${data.status}`, data.error_message ?? "")
        return null
      } catch (err) {
        if (attempt < MAX_ATTEMPTS) {
          console.warn(`[hunt/geocode/google] "${query}" failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying…`)
          await sleep(RETRY_DELAY_MS * attempt)
          continue
        }
        console.error(`[hunt/geocode/google] "${query}" failed:`, err)
        return null
      }
    }

    return null
  }
}
