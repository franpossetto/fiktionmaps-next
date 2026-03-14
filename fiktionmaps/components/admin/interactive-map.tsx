"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import {
  MapProvider,
  MapContainer,
  MapMarker,
  useMapControl,
  useGeocoding,
} from "@/lib/map"
import type { GeocodingPrediction } from "@/lib/map"

interface MapLocation {
  id: string
  name: string
  lat: number
  lng: number
}

interface InteractiveMapProps {
  onLocationSelect?: (lat: number, lng: number, address?: string) => void
  locations?: MapLocation[]
  center?: { lat: number; lng: number }
  selected?: { lat: number; lng: number }
  addressValue?: string
  onAddressChange?: (value: string) => void
  onError?: (message: string) => void
}

function MapController({
  selected,
  center,
}: {
  selected?: { lat: number; lng: number }
  center?: { lat: number; lng: number }
}) {
  const mapControl = useMapControl("admin-location-map")

  useEffect(() => {
    if (!mapControl) return
    if (selected) {
      mapControl.panTo(selected)
      return
    }
    if (center) {
      mapControl.panTo(center)
    }
  }, [mapControl, selected, center])

  return null
}

function AddressSearch({
  value,
  onChange,
  onSelect,
  onError,
}: {
  value: string
  onChange?: (value: string) => void
  onSelect: (lat: number, lng: number, address?: string) => void
  onError?: (message: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const geocoding = useGeocoding()
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [predictions, setPredictions] = useState<GeocodingPrediction[]>([])

  const handleGeocode = useCallback(async () => {
    if (!value.trim()) {
      onError?.("Enter a formatted address to locate.")
      return
    }
    if (!geocoding.ready) {
      onError?.("Map service not ready yet. Try again.")
      return
    }
    setIsGeocoding(true)
    const result = await geocoding.geocode(value)
    setIsGeocoding(false)
    if (!result) {
      onError?.("Could not find that address. Try another one.")
      return
    }
    onSelect(result.lat, result.lng, result.formattedAddress || value)
    setPredictions([])
  }, [value, geocoding, onSelect, onError])

  const handleInputChange = useCallback(
    async (nextValue: string) => {
      onChange?.(nextValue)
      onError?.("")
      const results = await geocoding.autocomplete(nextValue)
      setPredictions(results)
    },
    [onChange, onError, geocoding],
  )

  const handlePredictionSelect = useCallback(
    async (prediction: GeocodingPrediction) => {
      const result = await geocoding.getPlaceDetails(prediction.id)
      if (!result) {
        onError?.("Could not load that address. Try another one.")
        return
      }
      if (result.formattedAddress) onChange?.(result.formattedAddress)
      onSelect(result.lat, result.lng, result.formattedAddress)
      setPredictions([])
    },
    [geocoding, onSelect, onChange, onError],
  )

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleGeocode()
            }
          }}
          placeholder="Type the full address and press Enter"
          autoComplete="off"
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:border-foreground transition-colors"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
          Press Enter
        </div>
      </div>
      {predictions.length > 0 && (
        <div className="rounded-lg border border-border bg-background shadow-lg overflow-hidden">
          {predictions.map((prediction) => (
            <button
              key={prediction.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePredictionSelect(prediction)}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors"
            >
              {prediction.description}
            </button>
          ))}
        </div>
      )}
      {isGeocoding && <p className="text-xs text-muted-foreground">Locating address…</p>}
    </div>
  )
}

export function InteractiveMap({
  onLocationSelect,
  locations = [],
  center = { lat: 51.5074, lng: -0.1278 },
  selected,
  addressValue = "",
  onAddressChange,
  onError,
}: InteractiveMapProps) {
  const handleSelect = useCallback(
    (lat: number, lng: number, address?: string) => {
      if (address) onAddressChange?.(address)
      onLocationSelect?.(lat, lng, address)
      onError?.("")
    },
    [onLocationSelect, onError, onAddressChange],
  )

  return (
    <MapProvider libraries={["places"]}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
          <AddressSearch
            value={addressValue}
            onChange={onAddressChange}
            onSelect={handleSelect}
            onError={onError}
          />

          <div className="mt-4 space-y-3">
            <div className="relative w-full h-[420px] rounded-xl border border-border overflow-hidden">
              <MapContainer
                id="admin-location-map"
                defaultCenter={center}
                defaultZoom={13}
                colorScheme="light"
                className="h-full w-full"
                onClick={(pos) => handleSelect(pos.lat, pos.lng)}
              >
                <MapController selected={selected} center={center} />

                {locations.map((loc) => (
                  <MapMarker
                    key={loc.id}
                    position={{ lat: loc.lat, lng: loc.lng }}
                    title={loc.name}
                  >
                    <div className="h-2.5 w-2.5 rounded-full bg-foreground/80 border border-border shadow-[0_0_8px_rgba(0,0,0,0.3)]" />
                  </MapMarker>
                ))}

                {selected && (
                  <MapMarker position={selected} title="Selected location">
                    <div className="h-4 w-4 rounded-full bg-foreground border-2 border-white shadow-lg" />
                  </MapMarker>
                )}
              </MapContainer>
            </div>

            {selected && (
              <div className="grid grid-cols-2 gap-3">
                <div className="px-3 py-2 rounded-lg border border-border bg-background">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-1 uppercase">Latitude</p>
                  <p className="text-sm font-mono text-foreground">{selected.lat.toFixed(5)}</p>
                </div>
                <div className="px-3 py-2 rounded-lg border border-border bg-background">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-1 uppercase">Longitude</p>
                  <p className="text-sm font-mono text-foreground">{selected.lng.toFixed(5)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MapProvider>
  )
}
