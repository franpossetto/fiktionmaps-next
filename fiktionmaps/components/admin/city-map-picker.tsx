"use client"

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { MapProvider, MapContainer } from "@/lib/map"
import type { MapControlHandle } from "@/lib/map/types"
import { cn } from "@/lib/utils"
import { MAPBOX_ACCESS_TOKEN } from "@/lib/map/mapbox/styles"

const CITY_MAP_ID = "admin-city-map"
const BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places"
const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 }
const INTRO_CENTER = { lat: 20, lng: 0 }
const DEFAULT_ZOOM = 10
const MIN_ZOOM = 0
const MAX_ZOOM = 22

const INTRO_FLY_DURATION = 2000
const CITY_FLY_DURATION = 2500

interface MapboxPlaceFeature {
  id: string
  text: string
  place_name: string
  center: [number, number]
  context?: Array<{ id: string; text: string }>
}

export interface CityMapPickerProps {
  center: { lat: number; lng: number }
  zoom: number
  onCenterChange: (lat: number, lng: number) => void
  onZoomChange: (zoom: number) => void
  onCitySelect?: (lat: number, lng: number, name: string, country: string) => void
  /** Called when the user clears the search input */
  onClear?: () => void
  showSearch?: boolean
  onError?: (message: string) => void
  className?: string
  mapKeySuffix?: string
  cityName?: string
  cityCountry?: string
  /** When true: starts at zoom 0, spins the globe, then flies to selected city */
  introMode?: boolean
  /** When provided, shows a Next button inline with the search input */
  onNext?: () => void
  /** Rendered as an absolute overlay inside the map container */
  mapOverlay?: ReactNode
}

function CityMapSync({
  zoom,
  flyToTarget,
  clearFlyToTarget,
  mapControlRef,
  mapReady,
  blocked,
}: {
  zoom: number
  flyToTarget: { lat: number; lng: number } | null
  clearFlyToTarget: () => void
  mapControlRef: React.MutableRefObject<MapControlHandle | null>
  mapReady: boolean
  blocked: boolean
}) {
  useEffect(() => {
    if (!mapReady || blocked) return
    const ctrl = mapControlRef.current
    if (!ctrl) return
    ctrl.setZoom(zoom)
  }, [mapReady, zoom, mapControlRef, blocked])

  useEffect(() => {
    if (!flyToTarget || !mapReady || blocked) return
    const target = { ...flyToTarget }
    const tryMove = () => {
      const ctrl = mapControlRef.current
      if (!ctrl) return false
      try {
        ctrl.flyTo({ center: target, zoom, duration: 1200 })
        setTimeout(clearFlyToTarget, 1400)
        return true
      } catch {
        return false
      }
    }
    if (tryMove()) return
    const id = setInterval(tryMove, 100)
    const t = setTimeout(() => clearInterval(id), 6000)
    return () => { clearInterval(id); clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToTarget?.lat, flyToTarget?.lng, zoom, mapReady, mapControlRef, blocked])
  return null
}

function CitySearch({
  onSelect,
  onError,
  onClear,
}: {
  onSelect: (lat: number, lng: number, name: string, country: string) => void
  onError?: (message: string) => void
  onClear?: () => void
}) {
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState<MapboxPlaceFeature[]>([])

  const searchCities = useCallback(async (input: string) => {
    if (!MAPBOX_ACCESS_TOKEN || input.trim().length < 2) {
      setPredictions([])
      return
    }
    try {
      const params = new URLSearchParams({
        access_token: MAPBOX_ACCESS_TOKEN,
        autocomplete: "true",
        types: "place",
        limit: "5",
        language: "en",
      })
      const res = await fetch(`${BASE_URL}/${encodeURIComponent(input)}.json?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setPredictions((data.features ?? []) as MapboxPlaceFeature[])
    } catch {
      setPredictions([])
    }
  }, [])

  const handleClear = useCallback(() => {
    setValue("")
    setPredictions([])
    onError?.("")
    onClear?.()
  }, [onError, onClear])

  const handleInputChange = useCallback(
    (nextValue: string) => {
      setValue(nextValue)
      onError?.("")
      if (!nextValue.trim()) {
        setPredictions([])
        onClear?.()
        return
      }
      searchCities(nextValue)
    },
    [onError, searchCities, onClear],
  )

  const parseNameAndCountry = useCallback((feature: MapboxPlaceFeature) => {
    const name = feature.text || feature.place_name?.split(",")[0]?.trim() || ""
    const countryContext = feature.context?.find((c) => c.id.startsWith("country."))
    const country = countryContext?.text || feature.place_name?.split(",").pop()?.trim() || ""
    return { name, country }
  }, [])

  const handleSelect = useCallback(
    (feature: MapboxPlaceFeature) => {
      const [lng, lat] = feature.center
      const { name, country } = parseNameAndCountry(feature)
      onSelect(lat, lng, name, country)
      setValue(feature.place_name)
      setPredictions([])
      onError?.("")
    },
    [onSelect, onError, parseNameAndCountry],
  )

  const handleGeocode = useCallback(async () => {
    if (!value.trim()) { onError?.("Enter a city name to search."); return }
    if (!MAPBOX_ACCESS_TOKEN) { onError?.("Map not ready."); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ access_token: MAPBOX_ACCESS_TOKEN, types: "place", limit: "1", language: "en" })
      const res = await fetch(`${BASE_URL}/${encodeURIComponent(value)}.json?${params}`)
      if (!res.ok) { onError?.("Could not find that city."); return }
      const data = await res.json()
      const feature = data.features?.[0] as MapboxPlaceFeature | undefined
      if (!feature) { onError?.("No city found. Try another name."); return }
      handleSelect(feature)
    } catch {
      onError?.("Search failed. Try again.")
    } finally {
      setLoading(false)
    }
  }, [value, onError, handleSelect])

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGeocode() } }}
          placeholder="Search city (e.g. London, Paris)"
          autoComplete="off"
          className="w-full pl-12 pr-10 py-4 text-base border-t-0 border-b border-x-0 border-border rounded-none bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 transition-colors"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 border-b border-x-0 border-border bg-background overflow-hidden">
          {predictions.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(feature)}
              className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors border-t border-border"
            >
              {feature.place_name}
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div className="absolute top-full left-0 right-0 px-4 py-3 bg-background border-b border-border">
          <p className="text-sm text-muted-foreground">Searching…</p>
        </div>
      )}
    </div>
  )
}

export function CityMapPicker({
  center,
  zoom,
  onCenterChange,
  onZoomChange,
  onCitySelect,
  onClear,
  showSearch = true,
  onError,
  className,
  mapKeySuffix,
  cityName,
  cityCountry,
  introMode = false,
  onNext,
  mapOverlay,
}: CityMapPickerProps) {
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const mapControlRef = useRef<MapControlHandle | null>(null)
  const spinRef = useRef(false)
  const spinLngRef = useRef(0)
  const mapKey = mapKeySuffix ? `admin-city-picker-${mapKeySuffix}` : "admin-city-picker"

  const safeCenter =
    Number.isFinite(center.lat) && Number.isFinite(center.lng) ? center : DEFAULT_CENTER
  const safeZoom =
    Number.isFinite(zoom) && zoom >= MIN_ZOOM && zoom <= MAX_ZOOM ? Math.round(zoom) : DEFAULT_ZOOM

  const safeZoomRef = useRef(safeZoom)
  useEffect(() => { safeZoomRef.current = safeZoom }, [safeZoom])

  const handleMapReady = useCallback((control: MapControlHandle) => {
    mapControlRef.current = control
    setMapReady(true)
    if (introMode) {
      spinLngRef.current = 0
      spinRef.current = true
      setSpinning(true)
      setTimeout(() => {
        control.flyTo({ center: INTRO_CENTER, zoom: 2, duration: INTRO_FLY_DURATION })
      }, 400)
    }
  }, [introMode])

  useEffect(() => {
    if (!spinning || !mapReady) return
    let frameId: number
    const tick = () => {
      if (!spinRef.current) return
      const ctrl = mapControlRef.current
      if (ctrl?.setCenter) {
        spinLngRef.current = (spinLngRef.current + 0.15) % 360
        ctrl.setCenter({ lat: 20, lng: spinLngRef.current })
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [spinning, mapReady])

  const stopSpinning = useCallback(() => {
    spinRef.current = false
    setSpinning(false)
  }, [])

  /** Restart the spinning intro — called when user clears the search */
  const handleClearCity = useCallback(() => {
    if (introMode && mapReady) {
      spinRef.current = true
      setSpinning(true)
      mapControlRef.current?.flyTo({ center: INTRO_CENTER, zoom: 0, duration: 1500 })
    }
    onClear?.()
  }, [introMode, mapReady, onClear])

  const handleCenterChange = useCallback(
    (pos: { lat: number; lng: number }) => {
      if (spinRef.current) return
      onCenterChange(pos.lat, pos.lng)
      onError?.("")
    },
    [onCenterChange, onError],
  )

  const handleCitySelect = useCallback(
    (lat: number, lng: number, name: string, country: string) => {
      if (spinRef.current) {
        // Globe is spinning — stop it, set zoom state before unblocking CityMapSync
        spinRef.current = false
        onZoomChange(12)
        mapControlRef.current?.flyTo({ center: { lat, lng }, zoom: 12, duration: CITY_FLY_DURATION })
        setTimeout(() => setSpinning(false), CITY_FLY_DURATION)
      } else {
        // Not spinning — fly directly; do NOT call onZoomChange here or CityMapSync will
        // immediately call setZoom(12) and interrupt the flyTo animation
        mapControlRef.current?.flyTo({ center: { lat, lng }, zoom: 12, duration: 1200 })
        // onZoomEnd on the map will call onZoomChange(12) once the animation completes
      }
      onCenterChange(lat, lng)
      onCitySelect?.(lat, lng, name, country)
      onError?.("")
    },
    [onCenterChange, onCitySelect, onError, onZoomChange],
  )

  const mapDefaultCenter = introMode ? INTRO_CENTER : safeCenter
  const mapDefaultZoom = introMode ? 0 : safeZoom

  return (
    <MapProvider libraries={["places"]}>
      <div className={cn("w-full flex flex-col flex-1 min-h-0", className)}>
        {/* Map — search is overlaid at the top */}
        <div
          className="relative flex-1 min-h-[60vh] overflow-hidden"
          onMouseDown={spinning ? stopSpinning : undefined}
          onTouchStart={spinning ? stopSpinning : undefined}
        >
          <MapContainer
            id={CITY_MAP_ID}
            mapKey={mapKey}
            defaultCenter={mapDefaultCenter}
            defaultZoom={mapDefaultZoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            className="h-full w-full"
            onCenterChange={handleCenterChange}
            onZoomChange={onZoomChange}
            onMapReady={handleMapReady}
            controls={{ zoom: false }}
          >
            <CityMapSync
              zoom={safeZoom}
              flyToTarget={flyToTarget}
              clearFlyToTarget={() => setFlyToTarget(null)}
              mapControlRef={mapControlRef}
              mapReady={mapReady}
              blocked={spinning}
            />
          </MapContainer>

          {/* Search bar overlaid at the top of the map */}
          {showSearch && (
            <div className="absolute top-0 left-0 right-0 z-10">
              <CitySearch
                onSelect={handleCitySelect}
                onError={onError}
                onClear={handleClearCity}
              />
            </div>
          )}

          {mapOverlay}
        </div>
      </div>
    </MapProvider>
  )
}
