"use client"

import { useEffect, useRef, useState } from "react"
import { useMap } from "react-map-gl/mapbox"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { MapContainer, MapMarker, MapProvider, useMapLoaded } from "@/lib/map"
import { PlaceMarker2d } from "@/lib/map/pin-markers"
import { useMapMarker2dShape } from "@/lib/theme-settings-context"
import { cn } from "@/lib/utils"
import type { FictionStoryMapPin } from "@/components/fictions/story/build-fiction-story-cards"

const MAP_ID = "fiction-story-close"
const TOUR_MS = 4200
const PLACE_ZOOM = 17.15

function CloseMapCamera({
  mapId,
  center,
  zoom,
  pins,
  onFocus,
}: {
  mapId: string
  center: { lat: number; lng: number }
  zoom: number
  pins: FictionStoryMapPin[]
  onFocus: (id: string | undefined) => void
}) {
  const maps = useMap()
  const mapRef = maps?.[mapId] ?? maps?.current
  const mapLoaded = useMapLoaded()
  const lastSize = useRef({ w: 0, h: 0 })

  useEffect(() => {
    if (!mapLoaded || !mapRef) return
    const map = mapRef.getMap()
    const container = map.getContainer()
    if (!container) return

    const resizeIfNeeded = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w <= 0 || h <= 0) return
      if (w === lastSize.current.w && h === lastSize.current.h) return
      lastSize.current = { w, h }
      try {
        map.resize()
      } catch {
        // map not ready
      }
    }

    const first = pins[0]
    try {
      map.jumpTo({
        center: [first?.lng ?? center.lng, first?.lat ?? center.lat],
        zoom: PLACE_ZOOM,
        pitch: 54,
        bearing: -18,
      })
    } catch {
      // map not ready
    }
    resizeIfNeeded()

    const stops: FictionStoryMapPin[] =
      pins.length > 0
        ? pins
        : [{ id: "center", lat: center.lat, lng: center.lng, name: "", image: "", imageFocus: null }]
    let i = 0
    let cancelled = false
    let paused = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let resume: number | undefined

    const go = () => {
      if (cancelled) return
      if (paused) {
        timer = setTimeout(go, 800)
        return
      }
      const stop = stops[i % stops.length]!
      onFocus(stop.id)
      try {
        map.flyTo({
          center: [stop.lng, stop.lat],
          zoom: PLACE_ZOOM,
          pitch: 54,
          bearing: (i * 48) % 360,
          duration: TOUR_MS,
          essential: true,
        })
      } catch {
        // map not ready
      }
      i += 1
      timer = setTimeout(go, TOUR_MS + 400)
    }

    const pause = () => {
      paused = true
      try {
        map.stop()
      } catch {
        // map not ready
      }
      window.clearTimeout(resume)
      resume = window.setTimeout(() => {
        paused = false
      }, 4500)
    }

    const raf = requestAnimationFrame(resizeIfNeeded)
    const later = window.setTimeout(resizeIfNeeded, 160)
    const start = window.setTimeout(go, 700)
    const observer = new ResizeObserver(() => resizeIfNeeded())
    observer.observe(container)
    container.addEventListener("pointerdown", pause)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(later)
      window.clearTimeout(start)
      window.clearTimeout(timer)
      window.clearTimeout(resume)
      observer.disconnect()
      container.removeEventListener("pointerdown", pause)
      try {
        map.stop()
      } catch {
        // already gone
      }
    }
  }, [mapLoaded, mapRef, center.lat, center.lng, zoom, pins, onFocus, mapId])

  return null
}

function CloseMapPin({
  mapId,
  pin,
  featured,
  open,
  onToggle,
}: {
  mapId: string
  pin: FictionStoryMapPin
  featured: boolean
  open: boolean
  onToggle: () => void
}) {
  const maps = useMap()
  const mapRef = maps?.[mapId] ?? maps?.current
  const mapLoaded = useMapLoaded()
  const shape = useMapMarker2dShape()
  if (!mapLoaded) return null

  const onPinClick = (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    onToggle()
    if (open) return
    try {
      mapRef?.getMap().flyTo({
        center: [pin.lng, pin.lat],
        zoom: PLACE_ZOOM,
        pitch: 54,
        duration: 900,
        essential: true,
      })
    } catch {
      // map not ready
    }
  }

  return (
    <MapMarker
      position={{ lat: pin.lat, lng: pin.lng }}
      anchor="bottom"
      zIndex={open ? 30 : featured ? 20 : 10}
    >
      <div
        data-fiction-story-pin=""
        className="pointer-events-auto flex cursor-pointer flex-col items-center"
        onClick={onPinClick}
      >
        <div
          className={cn(
            "origin-bottom transition-transform duration-300",
            open ? "scale-[1.35]" : featured ? "scale-110" : "scale-100",
          )}
        >
          <PlaceMarker2d
            shape={shape}
            imageSrc={pin.image.trim() || DEFAULT_FICTION_COVER}
            imageFocus={pin.imageFocus ?? null}
            label={pin.name}
            labelMode="hover"
            isSelected={open || featured}
            isHovered={false}
            preview
          />
        </div>
      </div>
    </MapMarker>
  )
}

export function FictionStoryCloseMap({
  mapId = MAP_ID,
  pins,
  center,
  zoom,
}: {
  mapId?: string
  pins: FictionStoryMapPin[]
  center: { lat: number; lng: number }
  zoom: number
}) {
  const [focusId, setFocusId] = useState<string | undefined>(pins[0]?.id)
  const [selectedId, setSelectedId] = useState<string | undefined>()

  return (
    <MapProvider libraries={[]}>
      <div
        className="absolute inset-0 h-full w-full"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("[data-fiction-story-pin], .mapboxgl-marker")) {
            event.stopPropagation()
          }
        }}
      >
        <MapContainer
          id={mapId}
          mapKey={mapId}
          defaultCenter={center}
          defaultZoom={PLACE_ZOOM}
          minZoom={12}
          maxZoom={18}
          interactive
          scrollZoom={false}
          doubleClickZoom={false}
          controls={{ fullscreen: false }}
          showBuildings3D={false}
          showLoadingOverlay={false}
          className="h-full w-full"
        >
          <CloseMapCamera mapId={mapId} center={center} zoom={zoom} pins={pins} onFocus={setFocusId} />
          {pins.map((pin) => (
            <CloseMapPin
              key={pin.id}
              mapId={mapId}
              pin={pin}
              featured={pin.id === focusId}
              open={pin.id === selectedId}
              onToggle={() => setSelectedId((id) => (id === pin.id ? undefined : pin.id))}
            />
          ))}
        </MapContainer>
      </div>
    </MapProvider>
  )
}
