"use client"

import { useEffect } from "react"
import Image from "next/image"
import { useMap } from "react-map-gl/mapbox"
import { MapContainer, MapMarker, MapProvider, useMapLoaded } from "@/lib/map"
import type { LatLng } from "@/lib/map/types"

export interface FictionPlaceDirectionsMapProps {
  mapInstanceId: string
  center: LatLng
  placeName: string
  imageSrc: string
}

/** Mapbox can mount before layout settles; force a resize so the pin lands on-center. */
function DirectionsMapResize({ mapId }: { mapId: string }) {
  const maps = useMap()
  const mapRef = maps?.[mapId] ?? maps?.current
  const mapLoaded = useMapLoaded()

  useEffect(() => {
    if (!mapLoaded || !mapRef) return
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
    const raf = requestAnimationFrame(resize)
    const later = window.setTimeout(resize, 120)
    const observer = new ResizeObserver(() => resize())
    observer.observe(container)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(later)
      observer.disconnect()
    }
  }, [mapLoaded, mapRef])

  return null
}

function DirectionsPlacePin({
  center,
  placeName,
  imageSrc,
}: {
  center: LatLng
  placeName: string
  imageSrc: string
}) {
  const mapLoaded = useMapLoaded()
  if (!mapLoaded) return null

  return (
    <MapMarker position={center} anchor="center">
      <div className="pointer-events-none flex flex-col items-center">
        <div
          className="relative h-14 w-14 overflow-hidden rounded-lg border-2 border-primary shadow-lg"
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
        >
          <Image src={imageSrc} alt={placeName} fill className="object-cover" sizes="56px" />
        </div>
        <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
        <p className="mt-0.5 max-w-[160px] truncate rounded-md bg-overlay/95 px-2 py-0.5 text-center text-[10px] font-semibold text-foreground backdrop-blur-sm shadow-md">
          {placeName}
        </p>
      </div>
    </MapMarker>
  )
}

/**
 * Single-place preview: theme-aware Mapbox style, non-interactive (no pan/zoom/clicks).
 */
export function FictionPlaceDirectionsMap({
  mapInstanceId,
  center,
  placeName,
  imageSrc,
}: FictionPlaceDirectionsMapProps) {
  return (
    <MapProvider libraries={[]}>
      <div className="relative min-h-[280px] h-[min(58vw,420px)] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/20 sm:min-h-[320px] sm:h-[400px]">
        <MapContainer
          id={mapInstanceId}
          mapKey={mapInstanceId}
          defaultCenter={center}
          defaultZoom={15}
          minZoom={11}
          maxZoom={18}
          interactive={false}
          controls={{ fullscreen: false }}
          showBuildings3D={false}
          className="h-full w-full"
        >
          <DirectionsMapResize mapId={mapInstanceId} />
          <DirectionsPlacePin center={center} placeName={placeName} imageSrc={imageSrc} />
        </MapContainer>
      </div>
    </MapProvider>
  )
}
