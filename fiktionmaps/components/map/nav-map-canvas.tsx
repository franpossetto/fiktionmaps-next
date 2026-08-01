"use client"

import { useEffect } from "react"
import { useMap } from "react-map-gl/mapbox"
import { MapContainer, MapMarker, useMapLoaded } from "@/lib/map"
import type { Place } from "@/src/places/domain/place.entity"
import type { City } from "@/src/cities/domain/city.entity"

function NavMapResizeTrigger() {
  const mapRef = useMap()?.current

  useEffect(() => {
    if (!mapRef) return
    const map = mapRef.getMap()
    const container = map.getContainer()
    if (!container) return

    const resize = () => {
      try {
        map.resize()
      } catch {
        // map not ready
      }
    }

    resize()
    const observer = new ResizeObserver(() => resize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [mapRef])

  return null
}

function NavMapPins({
  places,
  viewportCenter,
}: {
  places: Place[]
  viewportCenter: { lat: number; lng: number }
}) {
  const mapLoaded = useMapLoaded()

  if (!mapLoaded) return null

  return (
    <div className="absolute inset-0 pointer-events-none [&>*]:pointer-events-auto">
      {places.map((loc) => (
        <MapMarker key={loc.id} position={{ lat: loc.location.lat, lng: loc.location.lng }}>
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-sm" title={loc.name} />
        </MapMarker>
      ))}
      <MapMarker position={viewportCenter}>
        <div
          className="h-3 w-3 rounded-full border-2 border-white bg-primary shadow-md"
          title="You are here"
        />
      </MapMarker>
    </div>
  )
}

export function NavMapCanvas({
  city,
  viewportCenter,
  places,
  width,
  height,
  onMinimapClick,
}: {
  city: City
  viewportCenter: { lat: number; lng: number }
  places: Place[]
  width: number
  height: number
  onMinimapClick: (position: { lat: number; lng: number }) => void
}) {
  return (
    <div style={{ width, height }} className="transition-[width,height] duration-200">
      <MapContainer
        id="minimap"
        mapKey="minimap"
        defaultCenter={{ lat: city.lat, lng: city.lng }}
        center={viewportCenter}
        defaultZoom={11}
        minZoom={10}
        maxZoom={14}
        interactive={true}
        controls={{ fullscreen: false }}
        showBuildings3D={false}
        className="h-full w-full"
        onClick={onMinimapClick}
      >
        <NavMapResizeTrigger />
        <NavMapPins places={places} viewportCenter={viewportCenter} />
      </MapContainer>
    </div>
  )
}
