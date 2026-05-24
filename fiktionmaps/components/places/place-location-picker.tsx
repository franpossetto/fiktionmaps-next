"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search, X, MapPin } from "lucide-react"
import { MapProvider, MapContainer, MapMarker } from "@/lib/map"
import type { MapControlHandle } from "@/lib/map/types"
import { MAPBOX_ACCESS_TOKEN } from "@/lib/map/mapbox/styles"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { City } from "@/src/cities/domain/city.entity"

const SEARCH_BOX_URL = "https://api.mapbox.com/search/searchbox/v1"
export const PLACE_LOCATION_DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 }
export const PLACE_LOCATION_DEFAULT_ZOOM = 10
export const PLACE_LOCATION_MIN_ZOOM = 0
export const PLACE_LOCATION_MAX_ZOOM = 22
export const PLACE_LOCATION_FLY_DURATION = 1200

interface SearchBoxContextEntry {
  name?: string
  country_code?: string
}

interface SearchBoxContext {
  country?: SearchBoxContextEntry
  region?: SearchBoxContextEntry
  place?: SearchBoxContextEntry
}

interface SearchBoxSuggestion {
  name: string
  mapbox_id: string
  feature_type: string
  place_formatted?: string
  context?: SearchBoxContext
}

interface SearchBoxRetrieveFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name: string
    full_address?: string
    place_formatted?: string
    context?: SearchBoxContext
  }
}

function searchBoxContextToV5(
  context?: SearchBoxContext,
): Array<{ id: string; text: string }> {
  const out: Array<{ id: string; text: string }> = []
  if (context?.country?.name) {
    const code = context.country.country_code ?? "x"
    out.push({ id: `country.${code}`, text: context.country.name })
  }
  if (context?.region?.name) out.push({ id: "region.x", text: context.region.name })
  if (context?.place?.name) out.push({ id: "place.x", text: context.place.name })
  return out
}

export const LOCATION_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "street", label: "Street" },
  { value: "square", label: "Square" },
  { value: "park", label: "Park" },
  { value: "building", label: "Building" },
  { value: "restaurant", label: "Restaurant" },
  { value: "bar", label: "Bar" },
  { value: "cafe", label: "Cafe" },
  { value: "hotel", label: "Hotel" },
  { value: "station", label: "Station" },
  { value: "bridge", label: "Bridge" },
  { value: "monument", label: "Monument" },
  { value: "museum", label: "Museum" },
  { value: "landmark", label: "Landmark" },
  { value: "other", label: "Other" },
] as const

export type PlaceAddressMode = "place" | "street"

export type PlaceAddressSelectResult = {
  lat: number
  lng: number
  place_name: string
  text: string
  context?: Array<{ id: string; text: string }>
}

const ADDRESS_MODE_PLACEHOLDER: Record<PlaceAddressMode, string> = {
  place: "Search a place (e.g. Eiffel Tower, Platform 9¾)",
  street: "Search a street address (e.g. 9 de Julio 1058)",
}

const ADDRESS_MODE_MAPBOX_TYPES: Record<PlaceAddressMode, string> = {
  place: "poi",
  street: "address",
}

function newSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Resolve city_id from Mapbox context (place name + country) by matching our cities. */
export function resolveCityId(
  context: Array<{ id: string; text: string }> | undefined,
  placeName: string,
  cities: City[],
): string {
  const countryContext = context?.find((c) => c.id.startsWith("country."))
  const regionContext = context?.find((c) => c.id.startsWith("region.") || c.id.startsWith("place."))
  const country = countryContext?.text ?? ""
  const regionOrPlace = regionContext?.text ?? placeName.split(",")[0]?.trim() ?? ""

  for (const city of cities) {
    if (city.country !== country) continue
    if (city.name === regionOrPlace) return city.id
    if (regionOrPlace.toLowerCase().includes(city.name.toLowerCase())) return city.id
    if (city.name.toLowerCase().includes(regionOrPlace.toLowerCase())) return city.id
  }
  return cities[0]?.id ?? ""
}

export function PlaceAddressSearch({
  value,
  onChange,
  onSelect,
  onError,
  mode,
  placePlaceholder,
  streetPlaceholder,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (result: PlaceAddressSelectResult) => void
  onError?: (msg: string) => void
  mode: PlaceAddressMode
  placePlaceholder?: string
  streetPlaceholder?: string
}) {
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState<SearchBoxSuggestion[]>([])
  const sessionTokenRef = useRef<string>("")
  if (!sessionTokenRef.current) {
    sessionTokenRef.current = newSessionToken()
  }

  const placeholder =
    mode === "place"
      ? (placePlaceholder ?? ADDRESS_MODE_PLACEHOLDER.place)
      : (streetPlaceholder ?? ADDRESS_MODE_PLACEHOLDER.street)

  const search = useCallback(
    async (input: string) => {
      if (!MAPBOX_ACCESS_TOKEN || input.trim().length < 2) {
        setPredictions([])
        return
      }
      try {
        const params = new URLSearchParams({
          access_token: MAPBOX_ACCESS_TOKEN,
          session_token: sessionTokenRef.current,
          q: input,
          types: ADDRESS_MODE_MAPBOX_TYPES[mode],
          limit: "5",
          language: "en",
        })
        const res = await fetch(`${SEARCH_BOX_URL}/suggest?${params}`)
        if (!res.ok) return
        const data = await res.json()
        setPredictions((data.suggestions ?? []) as SearchBoxSuggestion[])
      } catch {
        setPredictions([])
      }
    },
    [mode],
  )

  useEffect(() => {
    if (!value.trim()) {
      setPredictions([])
      return
    }
    const t = setTimeout(() => search(value), 300)
    return () => clearTimeout(t)
  }, [value, search])

  useEffect(() => {
    setPredictions([])
  }, [mode])

  const handleSelect = useCallback(
    async (suggestion: SearchBoxSuggestion) => {
      if (!MAPBOX_ACCESS_TOKEN) return
      setLoading(true)
      try {
        const params = new URLSearchParams({
          access_token: MAPBOX_ACCESS_TOKEN,
          session_token: sessionTokenRef.current,
        })
        const res = await fetch(
          `${SEARCH_BOX_URL}/retrieve/${encodeURIComponent(suggestion.mapbox_id)}?${params}`,
        )
        if (!res.ok) {
          onError?.("Could not retrieve location.")
          return
        }
        const data = await res.json()
        const feat = (data.features?.[0]) as SearchBoxRetrieveFeature | undefined
        if (!feat) {
          onError?.("Could not retrieve location.")
          return
        }
        const [lng, lat] = feat.geometry.coordinates
        const placeName =
          feat.properties.full_address ??
          (feat.properties.place_formatted
            ? `${feat.properties.name}, ${feat.properties.place_formatted}`
            : feat.properties.name)
        onSelect({
          lat,
          lng,
          place_name: placeName,
          text: feat.properties.name,
          context: searchBoxContextToV5(feat.properties.context ?? suggestion.context),
        })
        onChange(placeName)
        setPredictions([])
        sessionTokenRef.current = newSessionToken()
        onError?.("")
      } catch {
        onError?.("Could not retrieve location.")
      } finally {
        setLoading(false)
      }
    },
    [onSelect, onChange, onError],
  )

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-9 w-full rounded-lg border border-border bg-background py-2 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {value ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange("")}
            className="absolute right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {loading && predictions.length === 0 ? (
        <div className="absolute left-0 right-0 top-full rounded-b-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          Searching…
        </div>
      ) : null}
      {predictions.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-0.5 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          {predictions.map((suggestion) => (
            <button
              key={suggestion.mapbox_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(suggestion)}
              className="w-full border-b border-border px-4 py-3 text-left text-sm text-foreground transition-colors last:border-b-0 hover:bg-muted"
            >
              <div className="truncate font-medium">{suggestion.name}</div>
              {suggestion.place_formatted ? (
                <div className="truncate text-xs text-muted-foreground">{suggestion.place_formatted}</div>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function PlaceAddressSearchWithTabs({
  value,
  onChange,
  onSelect,
  onError,
  searchMode,
  onSearchModeChange,
  placeTabLabel = "Place",
  streetTabLabel = "Street",
  placePlaceholder,
  streetPlaceholder,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (result: PlaceAddressSelectResult) => void
  onError?: (msg: string) => void
  searchMode: PlaceAddressMode
  onSearchModeChange: (mode: PlaceAddressMode) => void
  placeTabLabel?: string
  streetTabLabel?: string
  placePlaceholder?: string
  streetPlaceholder?: string
}) {
  return (
    <div className="space-y-2">
      <Tabs value={searchMode} onValueChange={(v) => onSearchModeChange(v as PlaceAddressMode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="place">{placeTabLabel}</TabsTrigger>
          <TabsTrigger value="street">{streetTabLabel}</TabsTrigger>
        </TabsList>
      </Tabs>
      <PlaceAddressSearch
        value={value}
        onChange={onChange}
        onSelect={onSelect}
        onError={onError}
        mode={searchMode}
        placePlaceholder={placePlaceholder}
        streetPlaceholder={streetPlaceholder}
      />
    </div>
  )
}

export interface PlaceLocationMapProps {
  mapId: string
  mapKey?: string
  latitude: number
  longitude: number
  placeName?: string
  previewUrl?: string | null
  className?: string
  onMapReady?: (ctrl: MapControlHandle) => void
}

export function PlaceLocationMap({
  mapId,
  mapKey = "place-location-map",
  latitude,
  longitude,
  placeName,
  previewUrl,
  className = "h-full w-full",
  onMapReady,
}: PlaceLocationMapProps) {
  const mapControlRef = useRef<MapControlHandle | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const safeCenter =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { lat: latitude, lng: longitude }
      : PLACE_LOCATION_DEFAULT_CENTER

  const hasPin = Number.isFinite(latitude) && Number.isFinite(longitude)

  return (
    <MapProvider libraries={[]}>
      <MapContainer
        id={mapId}
        mapKey={mapKey}
        defaultCenter={safeCenter}
        defaultZoom={PLACE_LOCATION_DEFAULT_ZOOM}
        minZoom={PLACE_LOCATION_MIN_ZOOM}
        maxZoom={PLACE_LOCATION_MAX_ZOOM}
        className={className}
        onMapReady={(ctrl) => {
          mapControlRef.current = ctrl
          setMapReady(true)
          onMapReady?.(ctrl)
        }}
        controls={{ zoom: true }}
      >
        {mapReady && hasPin ? (
          <MapMarker position={{ lat: latitude, lng: longitude }}>
            <div className="flex flex-col items-center">
              <div
                className="relative h-14 w-14 overflow-hidden rounded-lg border-2 border-border"
                style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <MapPin className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-border" />
              <div className="mt-0.5 max-w-[140px] truncate rounded-md bg-overlay/95 px-2 py-0.5 text-center text-[10px] font-semibold text-foreground shadow-lg backdrop-blur-sm">
                {placeName?.trim() || "Place name"}
              </div>
            </div>
          </MapMarker>
        ) : null}
      </MapContainer>
    </MapProvider>
  )
}

export function flyMapToLocation(
  ctrl: MapControlHandle | null,
  lat: number,
  lng: number,
  zoom = 15,
): void {
  ctrl?.flyTo({
    center: { lat, lng },
    zoom,
    duration: PLACE_LOCATION_FLY_DURATION,
  })
}
