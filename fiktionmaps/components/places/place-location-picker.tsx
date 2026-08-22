"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search, SlidersHorizontal, X, MapPin } from "lucide-react"
import { MapProvider, MapContainer, MapMarker } from "@/lib/map"
import type { MapControlHandle } from "@/lib/map/types"
import { MAPBOX_ACCESS_TOKEN } from "@/lib/map/mapbox/styles"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { City } from "@/src/cities/domain/city.entity"

const SEARCH_BOX_URL = "https://api.mapbox.com/search/searchbox/v1"
const GEOCODING_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places"
export const PLACE_LOCATION_DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 }
export const PLACE_LOCATION_DEFAULT_ZOOM = 10
export const PLACE_LOCATION_MIN_ZOOM = 0
export const PLACE_LOCATION_MAX_ZOOM = 22
export const PLACE_LOCATION_FLY_DURATION = 1200

export type MapboxSearchType = "poi" | "address" | "street"

export const DEFAULT_MAPBOX_SEARCH_TYPES: MapboxSearchType[] = ["address", "street", "poi"]

export const MAPBOX_SEARCH_TYPE_OPTIONS: {
  value: MapboxSearchType
  label: string
  description: string
}[] = [
  {
    value: "address",
    label: "Addresses",
    description: "Numbered street addresses",
  },
  {
    value: "street",
    label: "Streets & intersections",
    description: "Street names and corners (e.g. LaSalle St and Adams St)",
  },
  {
    value: "poi",
    label: "Places (POI)",
    description: "Landmarks, businesses, and points of interest",
  },
]

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

interface GeocodingFeature {
  id: string
  place_name: string
  center: [number, number]
  place_type?: string[]
  text: string
  context?: Array<{ id: string; text: string }>
  properties?: { accuracy?: string }
}

function looksLikeIntersectionQuery(input: string): boolean {
  return /\s(&|and)\s/i.test(input)
}

function formatSearchBoxSuggestionAddress(suggestion: SearchBoxSuggestion): string {
  return suggestion.place_formatted
    ? `${suggestion.name}, ${suggestion.place_formatted}`
    : suggestion.name
}

/** Search Box retrieve snaps street intersections to a nearby numbered address; use Geocoding v5 instead. */
async function geocodeStreetIntersectionSuggestion(
  suggestion: SearchBoxSuggestion,
): Promise<PlaceAddressSelectResult | null> {
  if (!MAPBOX_ACCESS_TOKEN) return null
  const query = formatSearchBoxSuggestionAddress(suggestion)
  const geoParams = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    types: "address",
    limit: "1",
    language: "en",
  })
  const res = await fetch(`${GEOCODING_URL}/${encodeURIComponent(query)}.json?${geoParams}`)
  if (!res.ok) return null
  const data = await res.json()
  const feature = data.features?.[0] as GeocodingFeature | undefined
  if (!feature) return null
  const [lng, lat] = feature.center
  const placeName =
    feature.properties?.accuracy === "intersection"
      ? feature.place_name
      : formatSearchBoxSuggestionAddress(suggestion)
  return {
    lat,
    lng,
    place_name: placeName,
    text: suggestion.name,
    context: feature.context ?? searchBoxContextToV5(suggestion.context),
  }
}

function rankPredictions(predictions: AddressPrediction[], input: string): AddressPrediction[] {
  const intersectionQuery = looksLikeIntersectionQuery(input)
  if (!intersectionQuery) return predictions
  const score = (p: AddressPrediction): number => {
    const type = predictionFeatureType(p)
    if (type === "street") return 0
    if (type === "address") return 1
    return 2
  }
  return [...predictions].sort((a, b) => score(a) - score(b))
}

type AddressPrediction =
  | { source: "searchbox"; suggestion: SearchBoxSuggestion }
  | { source: "geocoding"; feature: GeocodingFeature }

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

function predictionKey(prediction: AddressPrediction): string {
  return prediction.source === "searchbox"
    ? prediction.suggestion.mapbox_id
    : prediction.feature.id
}

function predictionTitle(prediction: AddressPrediction): string {
  return prediction.source === "searchbox"
    ? prediction.suggestion.name
    : prediction.feature.text || prediction.feature.place_name.split(",")[0]?.trim() || ""
}

function predictionSubtitle(prediction: AddressPrediction): string | undefined {
  if (prediction.source === "searchbox") return prediction.suggestion.place_formatted
  const parts = prediction.feature.place_name.split(",").slice(1).map((p) => p.trim())
  return parts.length > 0 ? parts.join(", ") : undefined
}

function predictionFeatureType(prediction: AddressPrediction): string {
  if (prediction.source === "searchbox") return prediction.suggestion.feature_type
  return prediction.feature.place_type?.[0] ?? "address"
}

function featureTypeLabel(type: string, labels?: Partial<Record<MapboxSearchType, string>>): string {
  if (type === "poi") return labels?.poi ?? "Place"
  if (type === "street") return labels?.street ?? "Intersection"
  return labels?.address ?? "Address"
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
  { value: "house", label: "House" },
  { value: "theater", label: "Theater" },
  { value: "cinema", label: "Cinema" },
  { value: "other", label: "Other" },
] as const

/** @deprecated Use MapboxSearchType[] instead */
export type PlaceAddressMode = "place" | "street"

export type PlaceAddressSelectResult = {
  lat: number
  lng: number
  place_name: string
  text: string
  context?: Array<{ id: string; text: string }>
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

function MapboxSearchTypeFilter({
  searchTypes,
  onSearchTypesChange,
  typeLabels,
  filterLabel = "Result types",
}: {
  searchTypes: MapboxSearchType[]
  onSearchTypesChange: (types: MapboxSearchType[]) => void
  typeLabels?: Partial<Record<MapboxSearchType, string>>
  filterLabel?: string
}) {
  const toggleType = useCallback(
    (type: MapboxSearchType, checked: boolean) => {
      if (checked) {
        onSearchTypesChange([...searchTypes, type])
        return
      }
      if (searchTypes.length <= 1) return
      onSearchTypesChange(searchTypes.filter((t) => t !== type))
    },
    [searchTypes, onSearchTypesChange],
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-2.5"
          aria-label={filterLabel}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-xs tabular-nums">
            {searchTypes.length}/{MAPBOX_SEARCH_TYPE_OPTIONS.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{filterLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MAPBOX_SEARCH_TYPE_OPTIONS.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={searchTypes.includes(opt.value)}
            onCheckedChange={(checked) => toggleType(opt.value, checked === true)}
            onSelect={(e) => e.preventDefault()}
          >
            <span>{typeLabels?.[opt.value] ?? opt.label}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PlaceAddressSearch({
  value,
  onChange,
  onSelect,
  onError,
  searchTypes,
  placeholder = "Search address, intersection, or place…",
  intersectionHint,
  typeLabels,
  filterLabel,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (result: PlaceAddressSelectResult) => void
  onError?: (msg: string) => void
  searchTypes: MapboxSearchType[]
  placeholder?: string
  intersectionHint?: string
  typeLabels?: Partial<Record<MapboxSearchType, string>>
  filterLabel?: string
}) {
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState<AddressPrediction[]>([])
  const sessionTokenRef = useRef<string>("")
  if (!sessionTokenRef.current) {
    sessionTokenRef.current = newSessionToken()
  }
  // Selecting a suggestion echoes its place_name back through onChange so the
  // input reflects the pick — track it so that echo doesn't re-trigger a search
  // and reopen the dropdown on top of whatever renders below it.
  const lastSelectedValueRef = useRef<string | null>(null)

  const search = useCallback(
    async (input: string) => {
      if (!MAPBOX_ACCESS_TOKEN || input.trim().length < 2 || searchTypes.length === 0) {
        setPredictions([])
        return
      }
      try {
        const typesParam = searchTypes.join(",")
        const params = new URLSearchParams({
          access_token: MAPBOX_ACCESS_TOKEN,
          session_token: sessionTokenRef.current,
          q: input,
          types: typesParam,
          limit: "8",
          language: "en",
        })
        const res = await fetch(`${SEARCH_BOX_URL}/suggest?${params}`)
        const next: AddressPrediction[] = []
        if (res.ok) {
          const data = await res.json()
          for (const suggestion of (data.suggestions ?? []) as SearchBoxSuggestion[]) {
            next.push({ source: "searchbox", suggestion })
          }
        }

        const wantsStreetOrAddress = searchTypes.includes("address") || searchTypes.includes("street")
        if (next.length === 0 && wantsStreetOrAddress) {
          const geoParams = new URLSearchParams({
            access_token: MAPBOX_ACCESS_TOKEN,
            autocomplete: "true",
            types: "address",
            limit: "5",
            language: "en",
          })
          const geoRes = await fetch(`${GEOCODING_URL}/${encodeURIComponent(input)}.json?${geoParams}`)
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            for (const feature of (geoData.features ?? []) as GeocodingFeature[]) {
              next.push({ source: "geocoding", feature })
            }
          }
        }

        setPredictions(rankPredictions(next, input))
      } catch {
        setPredictions([])
      }
    },
    [searchTypes],
  )

  useEffect(() => {
    if (!value.trim() || value === lastSelectedValueRef.current) {
      setPredictions([])
      return
    }
    const t = setTimeout(() => search(value), 300)
    return () => clearTimeout(t)
  }, [value, search])

  const handleSelectSearchBox = useCallback(
    async (suggestion: SearchBoxSuggestion) => {
      if (!MAPBOX_ACCESS_TOKEN) return
      setLoading(true)
      try {
        if (suggestion.feature_type === "street") {
          const intersection = await geocodeStreetIntersectionSuggestion(suggestion)
          if (intersection) {
            onSelect(intersection)
            lastSelectedValueRef.current = intersection.place_name
            onChange(intersection.place_name)
            setPredictions([])
            sessionTokenRef.current = newSessionToken()
            onError?.("")
            return
          }
        }

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
        const feat = data.features?.[0] as SearchBoxRetrieveFeature | undefined
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
        lastSelectedValueRef.current = placeName
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

  const handleSelectGeocoding = useCallback(
    (feature: GeocodingFeature) => {
      const [lng, lat] = feature.center
      onSelect({
        lat,
        lng,
        place_name: feature.place_name,
        text: feature.text || feature.place_name.split(",")[0]?.trim() || "",
        context: feature.context,
      })
      lastSelectedValueRef.current = feature.place_name
      onChange(feature.place_name)
      setPredictions([])
      onError?.("")
    },
    [onSelect, onChange, onError],
  )

  const handleSelect = useCallback(
    (prediction: AddressPrediction) => {
      if (prediction.source === "searchbox") {
        void handleSelectSearchBox(prediction.suggestion)
        return
      }
      handleSelectGeocoding(prediction.feature)
    },
    [handleSelectSearchBox, handleSelectGeocoding],
  )

  return (
    <div className="space-y-1.5">
      <div className="relative w-full">
        <div className="relative flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        {loading && predictions.length === 0 ? (
          <div className="absolute left-0 right-0 top-full rounded-b-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            Searching…
          </div>
        ) : null}
        {predictions.length > 0 ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-0.5 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
            {predictions.map((prediction) => {
              const featureType = predictionFeatureType(prediction)
              return (
                <button
                  key={predictionKey(prediction)}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(prediction)}
                  className="w-full border-b border-border px-4 py-3 text-left text-sm text-foreground transition-colors last:border-b-0 hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 truncate font-medium">{predictionTitle(prediction)}</div>
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {featureTypeLabel(featureType, typeLabels)}
                    </span>
                  </div>
                  {predictionSubtitle(prediction) ? (
                    <div className="truncate text-xs text-muted-foreground">
                      {predictionSubtitle(prediction)}
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
      {intersectionHint ? (
        <p className="text-xs text-muted-foreground">{intersectionHint}</p>
      ) : null}
    </div>
  )
}

export function PlaceAddressSearchWithFilters({
  value,
  onChange,
  onSelect,
  onError,
  searchTypes,
  onSearchTypesChange,
  placeholder,
  intersectionHint,
  typeLabels,
  filterLabel,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (result: PlaceAddressSelectResult) => void
  onError?: (msg: string) => void
  searchTypes: MapboxSearchType[]
  onSearchTypesChange: (types: MapboxSearchType[]) => void
  placeholder?: string
  intersectionHint?: string
  typeLabels?: Partial<Record<MapboxSearchType, string>>
  filterLabel?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <PlaceAddressSearch
            value={value}
            onChange={onChange}
            onSelect={onSelect}
            onError={onError}
            searchTypes={searchTypes}
            placeholder={placeholder}
            intersectionHint={intersectionHint}
            typeLabels={typeLabels}
            filterLabel={filterLabel}
          />
        </div>
        <MapboxSearchTypeFilter
          searchTypes={searchTypes}
          onSearchTypesChange={onSearchTypesChange}
          typeLabels={typeLabels}
          filterLabel={filterLabel}
        />
      </div>
    </div>
  )
}

/** @deprecated Use PlaceAddressSearchWithFilters */
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
  const searchTypes: MapboxSearchType[] =
    searchMode === "place" ? ["poi"] : ["address", "street"]
  const handleTypesChange = useCallback(
    (types: MapboxSearchType[]) => {
      if (types.length === 1 && types[0] === "poi") {
        onSearchModeChange("place")
        return
      }
      onSearchModeChange("street")
    },
    [onSearchModeChange],
  )

  return (
    <PlaceAddressSearchWithFilters
      value={value}
      onChange={onChange}
      onSelect={onSelect}
      onError={onError}
      searchTypes={searchTypes}
      onSearchTypesChange={handleTypesChange}
      placeholder={
        searchMode === "place"
          ? (placePlaceholder ?? "Search a place (e.g. Eiffel Tower, Platform 9¾)")
          : (streetPlaceholder ?? "Search a street address (e.g. 9 de Julio 1058)")
      }
      typeLabels={{
        poi: placeTabLabel,
        address: streetTabLabel,
        street: "Intersection",
      }}
    />
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
  /** When false, pan/zoom stay enabled but map clicks are ignored (default). */
  pinEditMode?: boolean
  onMapClick?: (position: { lat: number; lng: number }) => void
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
  pinEditMode = false,
  onMapClick,
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
        center={hasPin ? safeCenter : undefined}
        defaultZoom={PLACE_LOCATION_DEFAULT_ZOOM}
        minZoom={PLACE_LOCATION_MIN_ZOOM}
        maxZoom={PLACE_LOCATION_MAX_ZOOM}
        className={className}
        onClick={pinEditMode ? onMapClick : undefined}
        onMapReady={(ctrl) => {
          mapControlRef.current = ctrl
          setMapReady(true)
          onMapReady?.(ctrl)
        }}
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
