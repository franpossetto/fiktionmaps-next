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
    const countryCtx = (
      feature.context as Array<{ id: string; text: string }> | undefined
    )?.find((c: { id: string }) => c.id.startsWith("country."))
    const country =
      countryCtx?.text || feature.place_name?.split(",").pop()?.trim() || ""
    return { name, country, lat: fLat, lng: fLng }
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
  const watchIdRef = useRef<number | null>(null)
  // Mirrors the latest pending check-in so the confirm callback stays stable
  // and the long-lived geolocation closure can read fresh coords too.
  const pendingRef = useRef<DetectedCity | null>(null)
  const latRef = useRef<number | null>(null)
  const lngRef = useRef<number | null>(null)

  useEffect(() => {
    pendingRef.current = pendingCityCheckin
  }, [pendingCityCheckin])

  useEffect(() => {
    latRef.current = lat
    lngRef.current = lng
  }, [lat, lng])

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
    }
    setPendingCityCheckin(null)
  }, [])

  useEffect(() => {
    if (!user) {
      lastCheckinCityIdRef.current = null
      return
    }
    let cancelled = false
    ;(async () => {
      const res = await getLastCityCheckinAction()
      if (cancelled) return
      lastCheckinCityIdRef.current = res.data?.cityId ?? null
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!user || typeof navigator === "undefined" || !navigator.geolocation) {
      return
    }

    setIsWatching(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const newLat = pos.coords.latitude
        const newLng = pos.coords.longitude
        setLat(newLat)
        setLng(newLng)
        setError(null)

        if (detectedCity) {
          const dist = haversineDistance(
            newLat,
            newLng,
            detectedCity.lat,
            detectedCity.lng,
          )
          if (dist < CITY_CHANGE_THRESHOLD_M) return
        }

        const mapboxCity = await reverseGeocodeCity(newLat, newLng)
        if (!mapboxCity) return

        const resolved = await resolveCity(mapboxCity)
        if (!resolved) return

        setDetectedCity(resolved)

        if (lastCheckinCityIdRef.current !== resolved.id) {
          setPendingCityCheckin(resolved)
        }
      },
      (err) => {
        setError(err.message)
        setIsWatching(false)
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      setIsWatching(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
