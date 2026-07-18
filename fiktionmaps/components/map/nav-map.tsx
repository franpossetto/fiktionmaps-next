"use client"

import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { useMap } from "react-map-gl/mapbox"
import { MapContainer, MapMarker, useMapLoaded } from "@/lib/map"
import type { Place } from "@/src/places/domain/place.entity"
import type { City } from "@/src/cities/domain/city.entity"
import { Expand, Map, Minimize2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useIsMobile } from "@/hooks/use-mobile"
import { useNavCollapsedStorage } from "@/lib/local-storage-service-hooks"
import { MAP_MINIMAP_SLOT_ID } from "./map-slots"

const SIZE_SMALL = { width: 200, height: 140 }
const SIZE_EXPANDED = { width: 360, height: 280 }

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

interface NavMapProps {
  city: City
  viewportCenter: { lat: number; lng: number }
  places: Place[]
  onMinimapClick: (position: { lat: number; lng: number }) => void
}

export function NavMap({ city, viewportCenter, places, onMinimapClick }: NavMapProps) {
  const t = useTranslations("Map")
  const isMobile = useIsMobile()
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [navCollapsed, setNavCollapsed] = useNavCollapsedStorage()
  const isVisible = !navCollapsed

  useEffect(() => {
    const el = document.getElementById(MAP_MINIMAP_SLOT_ID)
    if (el) setContainer(el)
  }, [])

  const handleMinimapClick = useCallback(
    (position: { lat: number; lng: number }) => {
      onMinimapClick(position)
    },
    [onMinimapClick],
  )

  if (isMobile) return null

  if (!container) return null

  if (!isVisible) {
    return createPortal(
      <button
        type="button"
        onClick={() => setNavCollapsed(false)}
        className="flex items-center gap-2 rounded-lg border border-border bg-chrome/95 px-3 py-2 text-xs font-medium text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors hover:bg-chrome"
        aria-label={t("showNavMap")}
      >
        <Map className="h-4 w-4" />
        {t("showNavMap")}
      </button>,
      container,
    )
  }

  const size = isExpanded ? SIZE_EXPANDED : SIZE_SMALL

  return createPortal(
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setNavCollapsed(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-chrome/95 text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors hover:bg-chrome"
          aria-label={t("hideNavMap")}
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsExpanded((e) => !e)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-chrome/95 text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors hover:bg-chrome"
          aria-label={isExpanded ? t("collapseMap") : t("expandMap")}
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Expand className="h-4 w-4" />
          )}
        </button>
      </div>
      <div
        className="overflow-hidden rounded-lg border border-border bg-background ring-1 ring-black/10"
        style={{
          boxShadow:
            "0 4px 6px -1px rgba(0,0,0,0.2), 0 10px 24px -4px rgba(0,0,0,0.35), 0 20px 48px -8px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ width: size.width, height: size.height }} className="transition-[width,height] duration-200">
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
            onClick={handleMinimapClick}
          >
            <NavMapResizeTrigger />
            <NavMapPins places={places} viewportCenter={viewportCenter} />
          </MapContainer>
        </div>
      </div>
    </div>,
    container,
  )
}
