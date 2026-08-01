"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { MAPBOX_ACCESS_TOKEN } from "@/lib/map/mapbox/styles"
import { haversineDistance } from "@/lib/geo/haversine"
import { useAuth } from "@/context/auth-context"
import { findOrCreateCityAction } from "@/src/cities/infrastructure/next/city.actions"
import {
  checkinCityAction,
  getLastCityCheckinAction,
} from "@/src/checkins/infrastructure/next/checkin.actions"

interface DetectedCity {
  /** UUID from the cities DB table. */
  id: string
  name: string
  country: string
  lat: number
  lng: number
}

interface GeoContextValue {
  lat: number | null
  lng: number | null
  isWatching: boolean
  error: string | null
  detectedCity: DetectedCity | null
  pendingCityCheckin: DetectedCity | null
  dismissCityCheckin: () => void
  confirmCityCheckin: () => Promise<void>
}

const GeoContext = createContext<GeoContextValue>({
  lat: null,
  lng: null,
  isWatching: false,
  error: null,
  detectedCity: null,
  pendingCityCheckin: null,
  dismissCityCheckin: () => {},
  confirmCityCheckin: async () => {},
})

export function useGeo() {
  return useContext(GeoContext)
}

const REVERSE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places"
const CITY_CHANGE_THRESHOLD_M = 5_000

interface MapboxCityResult {
  name: string
  country: string
  /** Region/state from Mapbox context — slug disambiguation only, not persisted. */
  region?: string
  lat: number
  lng: number
}

async function reverseGeocodeCity(
  lat: number,
  lng: number,
): Promise<MapboxCityResult | null> {
  if (!MAPBOX_ACCESS_TOKEN) return null
  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      types: "place",
      limit: "1",
      language: "en",
    })
    const res = await fetch(`${REVERSE_URL}/${lng},${lat}.json?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null
    const [fLng, fLat] = feature.center as [number, number]
    const name =
      feature.text || feature.place_name?.split(",")[0]?.trim() || ""
    const context = feature.context as Array<{ id: string; text: string }> | undefined
    const countryCtx = context?.find((c) => c.id.startsWith("country."))
    const regionCtx = context?.find((c) => c.id.startsWith("region."))
    const country =
      countryCtx?.text || feature.place_name?.split(",").pop()?.trim() || ""
    const region = regionCtx?.text?.trim() || undefined
    return { name, country, region, lat: fLat, lng: fLng }
  } catch {
    return null
  }
}

async function resolveCity(
  mapboxCity: MapboxCityResult,
): Promise<DetectedCity | null> {
  const result = await findOrCreateCityAction({
    name: mapboxCity.name,
    country: mapboxCity.country,
    region: mapboxCity.region,
    lat: mapboxCity.lat,
    lng: mapboxCity.lng,
    zoom: 12,
  })
  if (!result.success) return null
  return {
    id: result.city.id,
    name: result.city.name,
    country: result.city.country,
    lat: result.city.lat,
    lng: result.city.lng,
  }
}

export function GeoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [isWatching, setIsWatching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedCity, setDetectedCity] = useState<DetectedCity | null>(null)
  const [pendingCityCheckin, setPendingCityCheckin] =
    useState<DetectedCity | null>(null)
  // Hydrated from DB; gates the prompt so we never show it when the
  // user's most recent city check-in already matches the detected city.
  const lastCheckinCityIdRef = useRef<string | null>(null)
  // City we've already prompted for (confirmed or dismissed). Prevents
  // re-asking on every GPS jitter/re-resolve as long as the city itself
  // hasn't changed — only a genuine change of city should trigger a new ask.
  const lastPromptedCityIdRef = useRef<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  // Mirrors the latest pending check-in so the confirm callback stays stable
  // and the long-lived geolocation closure can read fresh coords too.
  const pendingRef = useRef<DetectedCity | null>(null)
  const latRef = useRef<number | null>(null)
  const lngRef = useRef<number | null>(null)
  /** Fresh city for the long-lived watchPosition closure (avoids stale null). */
  const detectedCityRef = useRef<DetectedCity | null>(null)
  /** In-flight reverse+resolve so rapid GPS ticks don't double-fetch. */
  const resolveInflightRef = useRef(false)

  useEffect(() => {
    pendingRef.current = pendingCityCheckin
  }, [pendingCityCheckin])

  useEffect(() => {
    latRef.current = lat
    lngRef.current = lng
  }, [lat, lng])

  useEffect(() => {
    detectedCityRef.current = detectedCity
  }, [detectedCity])

  const dismissCityCheckin = useCallback(() => {
    setPendingCityCheckin(null)
  }, [])

  const confirmCityCheckin = useCallback(async () => {
    const pending = pendingRef.current
    if (!pending) return
    const res = await checkinCityAction(
      pending.id,
      latRef.current,
      lngRef.current,
      "auto",
    )
    if (res.data) {
      lastCheckinCityIdRef.current = res.data.cityId
      lastPromptedCityIdRef.current = res.data.cityId
    }
    setPendingCityCheckin(null)
  }, [])

  useEffect(() => {
    if (!user) {
      lastCheckinCityIdRef.current = null
      lastPromptedCityIdRef.current = null
      return
    }
    let cancelled = false
    // Same defer as watchPosition — keep map first-paint free of check-in traffic.
    const id = window.setTimeout(() => {
      void (async () => {
        const res = await getLastCityCheckinAction()
        if (cancelled) return
        lastCheckinCityIdRef.current = res.data?.cityId ?? null
        lastPromptedCityIdRef.current = res.data?.cityId ?? null
      })()
    }, 1_500)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [user])

  useEffect(() => {
    if (!user || typeof navigator === "undefined" || !navigator.geolocation) {
      return
    }

    setIsWatching(true)

    // Defer geolocation until after first paint so map/auth boot isn't competing.
    const startId = window.setTimeout(() => {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const newLat = pos.coords.latitude
          const newLng = pos.coords.longitude
          setLat(newLat)
          setLng(newLng)
          setError(null)

          const currentCity = detectedCityRef.current
          if (currentCity) {
            const dist = haversineDistance(
              newLat,
              newLng,
              currentCity.lat,
              currentCity.lng,
            )
            if (dist < CITY_CHANGE_THRESHOLD_M) return
          }

          if (resolveInflightRef.current) return
          resolveInflightRef.current = true
          try {
            const mapboxCity = await reverseGeocodeCity(newLat, newLng)
            if (!mapboxCity) return

            const resolved = await resolveCity(mapboxCity)
            if (!resolved) return

            detectedCityRef.current = resolved
            setDetectedCity(resolved)

            // Only ask again when the city actually changed — not on every
            // GPS re-resolve for a city we already asked about (confirmed
            // or dismissed).
            if (
              lastCheckinCityIdRef.current !== resolved.id &&
              lastPromptedCityIdRef.current !== resolved.id
            ) {
              lastPromptedCityIdRef.current = resolved.id
              setPendingCityCheckin(resolved)
            }
          } finally {
            resolveInflightRef.current = false
          }
        },
        (err) => {
          setError(err.message)
          setIsWatching(false)
        },
        { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
      )
    }, 1_500)

    return () => {
      window.clearTimeout(startId)
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setIsWatching(false)
    }
  }, [user])

  return (
    <GeoContext.Provider
      value={{
        lat,
        lng,
        isWatching,
        error,
        detectedCity,
        pendingCityCheckin,
        dismissCityCheckin,
        confirmCityCheckin,
      }}
    >
      {children}
    </GeoContext.Provider>
  )
}
