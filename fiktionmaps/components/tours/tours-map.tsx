"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import type { Place, TourStopWithPlace } from "@/lib/modules/tours"
import type { City } from "@/lib/modules/cities"
import { useApi } from "@/lib/api"
import {
  MapProvider,
  MapContainer,
  MapMarker,
  MapPolyline,
  useMapControl,
} from "@/lib/map"

const MAP_MIN_ZOOM = 0

/** Tour map: individual markers only (no clustering). */
interface ToursMapProps {
  selectedCityId?: string | null
  places: Place[]
  interactive?: boolean
  focusZoom?: number
  showExploreMarkers?: boolean
  showStopMarkers?: boolean
  showActiveStopMessage?: boolean
  showPolyline?: boolean
  stopMarkerVariant?: "thumbnail" | "compact" | "selectedPhotoOnly"
  selectedPlaceId?: string | null
  onSelectPlace?: (place: Place) => void
  stops?: TourStopWithPlace[]
  activeStopIndex?: number
  onSelectStop?: (index: number) => void
  showStopNumbers?: boolean
}

function MapController({
  selectedCityId,
  places,
  selectedPlaceId,
  stops,
  activeStopIndex,
  focusZoom,
  allCities,
}: {
  selectedCityId?: string | null
  places: Place[]
  selectedPlaceId?: string | null
  stops: TourStopWithPlace[]
  activeStopIndex?: number
  focusZoom?: number
  allCities: City[]
}) {
  const mapControl = useMapControl()
  const didInitialFitRef = useRef(false)
  const previousCityIdRef = useRef<string | null | undefined>(selectedCityId)

  useEffect(() => {
    if (!mapControl || didInitialFitRef.current) return
    const source = stops.length > 0 ? stops.map((stop) => stop.place) : places
    if (source.length > 0) {
      mapControl.fitBounds(source.map((p) => ({ lat: p.lat, lng: p.lng })))
      didInitialFitRef.current = true
      return
    }
    if (selectedCityId) {
      const city = allCities.find((entry) => entry.id === selectedCityId)
      if (city) {
        mapControl.panTo({ lat: city.lat, lng: city.lng })
        mapControl.setZoom(city.zoom)
      }
    }
  }, [mapControl, places, selectedCityId, stops, allCities])

  useEffect(() => {
    if (!mapControl) return
    if (previousCityIdRef.current === selectedCityId) return
    previousCityIdRef.current = selectedCityId
    if (!selectedCityId) return

    const city = allCities.find((entry) => entry.id === selectedCityId)
    if (!city) return

    mapControl.panTo({ lat: city.lat, lng: city.lng })
    mapControl.setZoom(city.zoom)
  }, [mapControl, selectedCityId, allCities])

  useEffect(() => {
    if (!mapControl || !selectedPlaceId) return
    const place = places.find((entry) => entry.id === selectedPlaceId)
    if (!place) return
    mapControl.panTo({ lat: place.lat, lng: place.lng })
  }, [mapControl, places, selectedPlaceId])

  useEffect(() => {
    if (!mapControl) return
    if (activeStopIndex == null) return
    const stop = stops[activeStopIndex]
    if (!stop) return
    mapControl.panTo({ lat: stop.place.lat, lng: stop.place.lng })
    if (focusZoom) mapControl.setZoom(focusZoom)
  }, [activeStopIndex, focusZoom, mapControl, stops])

  return null
}

function ExploreMarkers({
  places,
  selectedPlaceId,
  onSelectPlace,
}: {
  places: Place[]
  selectedPlaceId?: string | null
  onSelectPlace?: (place: Place) => void
}) {
  return (
    <>
      {places.map((place) => {
        const isSelected = place.id === selectedPlaceId
        return (
          <MapMarker
            key={place.id}
            position={{ lat: place.lat, lng: place.lng }}
            onClick={() => onSelectPlace?.(place)}
            zIndex={isSelected ? 220 : 60}
          >
            <div className="group flex flex-col items-center">
              <div
                className={`relative overflow-hidden rounded-lg border-2 transition-all duration-150 ${
                  isSelected
                    ? "h-14 w-14 scale-105 border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]"
                    : "h-12 w-12 border-border"
                }`}
                style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.45))" }}
              >
                <Image
                  src={place.coverImage}
                  alt={place.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div
                className={`h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent ${
                  isSelected ? "border-t-primary" : "border-t-border"
                }`}
              />
            </div>
          </MapMarker>
        )
      })}
    </>
  )
}

function StopMarkers({
  stops,
  activeStopIndex,
  onSelectStop,
  showStopNumbers,
  showActiveStopMessage,
  variant,
}: {
  stops: TourStopWithPlace[]
  activeStopIndex?: number
  onSelectStop?: (index: number) => void
  showStopNumbers: boolean
  showActiveStopMessage: boolean
  variant: "thumbnail" | "compact" | "selectedPhotoOnly"
}) {
  return (
    <>
      {stops.map((stop, index) => {
        const isActive = index === activeStopIndex
        if (variant === "compact") {
          return (
            <MapMarker
              key={stop.id}
              position={{ lat: stop.place.lat, lng: stop.place.lng }}
              onClick={() => onSelectStop?.(index)}
              zIndex={isActive ? 320 : 180}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-semibold ${
                    isActive
                      ? "border-accent bg-accent text-accent-foreground shadow-[0_0_0_3px_hsl(var(--accent)/0.25)]"
                      : "border-muted-foreground bg-background text-foreground"
                  }`}
                  style={{ filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.5))" }}
                >
                  {showStopNumbers ? index + 1 : ""}
                </div>
                {showActiveStopMessage && isActive && (
                  <div className="max-w-[180px] rounded-md border border-border bg-background/95 px-2 py-1 text-[10px] leading-tight text-foreground shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
                    <p className="truncate font-semibold">{stop.place.name}</p>
                    <p className="truncate text-muted-foreground">{stop.note?.trim() || "Selected stop"}</p>
                  </div>
                )}
              </div>
            </MapMarker>
          )
        }

        if (variant === "selectedPhotoOnly") {
          return (
            <MapMarker
              key={stop.id}
              position={{ lat: stop.place.lat, lng: stop.place.lng }}
              onClick={() => onSelectStop?.(index)}
              zIndex={isActive ? 320 : 180}
              title={stop.place.name}
            >
              {isActive ? (
                <div className="group flex flex-col items-center">
                  <div
                    className="relative h-14 w-14 scale-105 overflow-hidden rounded-lg border-2 border-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.25)]"
                    style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.45))" }}
                  >
                    <Image
                      src={stop.place.coverImage}
                      alt={stop.place.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    {showStopNumbers && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-accent text-[10px] font-semibold text-accent-foreground">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-accent" />
                </div>
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-sm" />
              )}
            </MapMarker>
          )
        }

        return (
          <MapMarker
            key={stop.id}
            position={{ lat: stop.place.lat, lng: stop.place.lng }}
            onClick={() => onSelectStop?.(index)}
            zIndex={isActive ? 320 : 180}
          >
            <div className="group flex flex-col items-center">
              <div
                className={`relative overflow-hidden rounded-lg border-2 transition-all duration-150 ${
                  isActive
                    ? "h-14 w-14 scale-105 border-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.25)]"
                    : "h-12 w-12 border-border"
                }`}
                style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.45))" }}
              >
                <Image
                  src={stop.place.coverImage}
                  alt={stop.place.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
                {showStopNumbers && (
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-accent text-[10px] font-semibold text-accent-foreground">
                    {index + 1}
                  </div>
                )}
              </div>
              <div
                className={`h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent ${
                  isActive ? "border-t-accent" : "border-t-border"
                }`}
              />
            </div>
          </MapMarker>
        )
      })}
    </>
  )
}

export function ToursMap({
  selectedCityId,
  places,
  interactive = true,
  focusZoom,
  showExploreMarkers = true,
  showStopMarkers = true,
  showActiveStopMessage = false,
  showPolyline = true,
  stopMarkerVariant = "thumbnail",
  selectedPlaceId,
  onSelectPlace,
  stops = [],
  activeStopIndex,
  onSelectStop,
  showStopNumbers = false,
}: ToursMapProps) {
  const { cities: cityService } = useApi()
  const [allCities, setAllCities] = useState<City[]>([])

  useEffect(() => {
    cityService.getAll().then(setAllCities)
  }, [cityService])

  const primaryCity = useMemo(() => {
    if (allCities.length === 0) return null
    if (selectedCityId) return allCities.find((city) => city.id === selectedCityId) ?? allCities[0]
    if (stops.length > 0) {
      const city = allCities.find((entry) => entry.id === stops[0].place.cityId)
      if (city) return city
    }
    return allCities[0]
  }, [allCities, selectedCityId, stops])

  const polylinePath = useMemo(
    () => stops.map((stop) => ({ lat: stop.place.lat, lng: stop.place.lng })),
    [stops],
  )

  if (!primaryCity) return <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>

  return (
    <MapProvider>
      <MapContainer
        mapKey={`${selectedCityId ?? "all"}`}
        defaultCenter={{ lat: primaryCity.lat, lng: primaryCity.lng }}
        defaultZoom={primaryCity.zoom}
        minZoom={MAP_MIN_ZOOM}
        interactive={interactive}
        controls={{ zoom: interactive, fullscreen: interactive }}
        className="h-full w-full"
      >
        <MapController
          selectedCityId={selectedCityId}
          places={places}
          selectedPlaceId={selectedPlaceId}
          stops={stops}
          activeStopIndex={activeStopIndex}
          focusZoom={focusZoom}
          allCities={allCities}
        />
        {showExploreMarkers && places.length > 0 && (
          <ExploreMarkers places={places} selectedPlaceId={selectedPlaceId} onSelectPlace={onSelectPlace} />
        )}
        {stops.length > 0 && (
          <>
            {showStopMarkers && (
              <StopMarkers
                stops={stops}
                activeStopIndex={activeStopIndex}
                onSelectStop={onSelectStop}
                showStopNumbers={showStopNumbers}
                showActiveStopMessage={showActiveStopMessage}
                variant={stopMarkerVariant}
              />
            )}
            {showPolyline && <MapPolyline path={polylinePath} />}
          </>
        )}
      </MapContainer>
    </MapProvider>
  )
}
