"use client"

import { useEffect, useMemo, useState } from "react"
import type { Location } from "@/lib/modules/locations"
import type { City } from "@/lib/modules/cities"
import { useApi } from "@/lib/api"
import { MapPin, ZoomIn, ZoomOut, Navigation, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CheckInMapProps {
  locations: Location[]
  onCheckIn?: (location: Location) => void
}

export function CheckInMap({ locations, onCheckIn }: CheckInMapProps) {
  const { cities } = useApi()
  const [cityMap, setCityMap] = useState<Map<string, City>>(new Map())
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [zoom, setZoom] = useState(2)

  useEffect(() => {
    cities.getAll().then((all) => setCityMap(new Map(all.map((c) => [c.id, c]))))
  }, [cities])

  const locationsByCity = useMemo(() => locations.reduce((acc, loc) => {
    const city = cityMap.get(loc.cityId)
    if (!city) return acc
    if (!acc[city.id]) acc[city.id] = { city, locations: [] }
    acc[city.id].locations.push(loc)
    return acc
  }, {} as Record<string, { city: City; locations: Location[] }>), [locations, cityMap])

  const handleZoom = (direction: "in" | "out") => {
    setZoom((prev) => (direction === "in" ? Math.min(prev + 1, 5) : Math.max(prev - 1, 1)))
  }

  return (
    <div className="space-y-4">
      {/* Map visualization */}
      <div className="rounded-xl border border-border overflow-hidden bg-gradient-to-br from-blue-900/10 to-cyan-900/10">
        {/* Map header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-cyan-400" />
            Interactive Map
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleZoom("in")}
              className="p-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <ZoomIn className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={() => handleZoom("out")}
              className="p-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <ZoomOut className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={() => setZoom(2)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <Navigation className="h-4 w-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Map canvas - simplified world grid */}
        <div className="p-6 h-96 relative overflow-hidden flex items-center justify-center">
          {/* Grid background */}
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`h-${i}`}
                className="absolute w-full border-t border-muted-foreground"
                style={{ top: `${i * 10}%` }}
              />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`v-${i}`}
                className="absolute h-full border-l border-muted-foreground"
                style={{ left: `${i * 10}%` }}
              />
            ))}
          </div>

          {/* City markers */}
          <div className="relative w-full h-full">
            {Object.entries(locationsByCity).map(([cityId, { city, locations }]) => {
              // Normalize coordinates to map grid (0-100%)
              const x = ((city.lng + 180) / 360) * 100
              const y = ((90 - city.lat) / 180) * 100

              return (
                <div
                  key={cityId}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <button
                    onClick={() => setSelectedLocation(selectedLocation === cityId ? null : cityId)}
                    className={`relative group transition-transform hover:scale-125`}
                  >
                    {/* Outer ring */}
                    <div
                      className={`absolute inset-0 rounded-full border-2 transition-all ${
                        selectedLocation === cityId
                          ? "border-cyan-400 bg-cyan-500/30 w-20 h-20"
                          : "border-cyan-500/50 bg-cyan-500/10 w-16 h-16 group-hover:w-20 group-hover:h-20"
                      }`}
                      style={{ left: "-50%", top: "-50%" }}
                    />

                    {/* Center dot */}
                    <div className="relative w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50" />

                    {/* Label */}
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                      <p className="text-xs font-bold text-cyan-300">{city.name}</p>
                      <p className="text-xs text-muted-foreground text-center">{locations.length} locations</p>
                    </div>
                  </button>

                  {/* Location list when expanded */}
                  {selectedLocation === cityId && (
                    <div className="absolute top-full mt-12 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-xl p-2 w-48 z-50 pointer-events-auto">
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {locations.map((loc) => (
                          <button
                            key={loc.id}
                            onClick={() => onCheckIn?.(loc)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm text-foreground flex items-center justify-between group"
                          >
                            <span className="truncate">{loc.name}</span>
                            {!locations.some((l) => l.id === selectedLocation && l.id !== loc.id) && (
                              <Check className="h-3 w-3 text-cyan-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Zoom level indicator */}
      <div className="text-xs text-muted-foreground text-center">Zoom: {zoom}x</div>
    </div>
  )
}
