"use client"

import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react"
import Image from "next/image"
import { Bed, Minus, Plus } from "lucide-react"
import { useMap } from "react-map-gl/mapbox"
import { MapContainer, MapMarker, MapProvider, useMapLoaded } from "@/lib/map"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { useRouter } from "@/i18n/navigation"
import type { LatLng } from "@/lib/map/types"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export const WISHLIST_MAP_FRAME_CLASS =
  "relative min-h-[560px] h-[min(116vw,840px)] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/20 sm:min-h-[640px] sm:h-[800px]"

export type WishlistMapPin = {
  id: string
  name: string
  image: string | null
  href: string
  lat: number
  lng: number
  stop?: number
  far?: boolean
}

export type WishlistStayPin = {
  label: string
  lat: number
  lng: number
}

function hasValidCoords(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat === 0 && lng === 0) return false
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

function fitAllPins(
  map: {
    jumpTo: (opts: { center: [number, number]; zoom: number }) => void
    fitBounds: (
      b: [[number, number], [number, number]],
      o: { padding: number; maxZoom: number; duration: number },
    ) => void
  },
  pins: LatLng[],
) {
  if (pins.length === 0) return
  if (pins.length === 1) {
    map.jumpTo({ center: [pins[0]!.lng, pins[0]!.lat], zoom: 12 })
    return
  }
  const lngs = pins.map((p) => p.lng)
  const lats = pins.map((p) => p.lat)
  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    { padding: 96, maxZoom: 12, duration: 0 },
  )
}

function WishlistMapCamera({
  mapId,
  fitPins,
  pins,
  selectedId,
}: {
  mapId: string
  fitPins: LatLng[]
  pins: WishlistMapPin[]
  selectedId: string | null
}) {
  const maps = useMap()
  const mapRef = maps?.[mapId] ?? maps?.current
  const mapLoaded = useMapLoaded()
  const fitted = useRef(false)
  const lastSelected = useRef<string | null>(null)

  useEffect(() => {
    if (!mapLoaded || !mapRef) return
    const map = mapRef.getMap()
    const resize = () => {
      try {
        map.resize()
      } catch {
        // map not ready
      }
    }
    resize()
    if (!fitted.current && fitPins.length > 0) {
      try {
        fitAllPins(map, fitPins)
        fitted.current = true
      } catch {
        // bounds not ready
      }
    }
    const raf = requestAnimationFrame(resize)
    const later = window.setTimeout(resize, 120)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(later)
    }
  }, [mapLoaded, mapRef, fitPins])

  useEffect(() => {
    if (!mapLoaded || !mapRef || !selectedId) return
    if (lastSelected.current === selectedId) return
    lastSelected.current = selectedId
    const pin = pins.find((p) => p.id === selectedId)
    if (!pin) return
    try {
      mapRef.getMap().panTo([pin.lng, pin.lat], { duration: 700 })
    } catch {
      // map not ready
    }
  }, [mapLoaded, mapRef, pins, selectedId])

  return null
}

function WishlistPickCursor({ mapId, enabled }: { mapId: string; enabled: boolean }) {
  const maps = useMap()
  const mapRef = maps?.[mapId] ?? maps?.current

  useEffect(() => {
    let canvas: HTMLCanvasElement | null = null
    try {
      canvas = mapRef?.getMap().getCanvas() ?? null
    } catch {
      canvas = null
    }
    if (!canvas) return
    const previous = canvas.style.cursor
    if (enabled) canvas.style.cursor = "crosshair"
    return () => {
      canvas.style.cursor = previous
    }
  }, [mapRef, enabled])

  return null
}

function WishlistZoomBridge({
  mapId,
  mapApi,
}: {
  mapId: string
  mapApi: MutableRefObject<{ zoomBy: (delta: number) => void } | null>
}) {
  const maps = useMap()
  const mapRef = maps?.[mapId] ?? maps?.current

  useEffect(() => {
    let map: { getZoom: () => number; easeTo: (opts: { zoom: number; duration: number }) => void } | null = null
    try {
      map = mapRef?.getMap() ?? null
    } catch {
      map = null
    }
    if (!map) {
      mapApi.current = null
      return
    }
    const handle = map
    mapApi.current = {
      zoomBy(delta: number) {
        try {
          handle.easeTo({ zoom: handle.getZoom() + delta, duration: 200 })
        } catch {
          // map not ready
        }
      },
    }
    return () => {
      mapApi.current = null
    }
  }, [mapRef, mapApi])

  return null
}

function WishlistStayMarker({ stay }: { stay: WishlistStayPin }) {
  const mapLoaded = useMapLoaded()
  if (!mapLoaded) return null
  return (
    <MapMarker position={{ lat: stay.lat, lng: stay.lng }} anchor="center">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-yellow-400 bg-background shadow-lg">
          <Bed className="h-4 w-4 text-yellow-600" />
        </div>
        <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-yellow-400" />
      </div>
    </MapMarker>
  )
}

function WishlistPin({
  pin,
  selected,
  onOpen,
}: {
  pin: WishlistMapPin
  selected: boolean
  onOpen?: (href: string) => void
}) {
  const mapLoaded = useMapLoaded()
  if (!mapLoaded) return null
  return (
    <MapMarker
      position={{ lat: pin.lat, lng: pin.lng }}
      anchor="center"
      onClick={onOpen ? () => onOpen(pin.href) : undefined}
    >
      <div className={cn("flex flex-col items-center", onOpen ? "cursor-pointer" : "cursor-crosshair")}>
        <div className="relative">
          {pin.stop != null ? (
            <span
              className={cn(
                "absolute -left-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums shadow",
                selected
                  ? "bg-yellow-400 text-black"
                  : pin.far
                    ? "bg-amber-700 text-white"
                    : "bg-primary text-primary-foreground",
              )}
            >
              {pin.stop}
            </span>
          ) : null}
          <div
            className={cn(
              "relative h-12 w-12 overflow-hidden rounded-lg border-2 shadow-lg",
              selected
                ? "border-yellow-400 ring-2 ring-yellow-400/40"
                : pin.far
                  ? "border-amber-700"
                  : "border-primary",
            )}
          >
            <Image
              src={pin.image?.trim() || DEFAULT_FICTION_COVER}
              alt={pin.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        </div>
        <div
          className={cn(
            "h-0 w-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent",
            selected ? "border-t-yellow-400" : pin.far ? "border-t-amber-700" : "border-t-primary",
          )}
        />
      </div>
    </MapMarker>
  )
}

export function WishlistCityMap({
  mapInstanceId,
  pins,
  selectedId,
  stay,
  overlay,
  pickingStay,
  onMapClick,
}: {
  mapInstanceId: string
  pins: WishlistMapPin[]
  selectedId: string | null
  stay?: WishlistStayPin | null
  overlay?: ReactNode
  pickingStay?: boolean
  onMapClick?: (position: LatLng) => void
}) {
  const router = useRouter()
  const t = useTranslations("Profile")
  const mapApi = useRef<{ zoomBy: (delta: number) => void } | null>(null)
  const valid = pins.filter((p) => hasValidCoords(p.lat, p.lng))
  const fallback = stay ?? valid[0] ?? { lat: 48.8566, lng: 2.3522 }
  const fitPins: LatLng[] = [
    ...valid,
    ...(stay && hasValidCoords(stay.lat, stay.lng) ? [{ lat: stay.lat, lng: stay.lng }] : []),
  ]

  return (
    <MapProvider libraries={[]}>
      <div className={WISHLIST_MAP_FRAME_CLASS}>
        <MapContainer
          id={mapInstanceId}
          mapKey={mapInstanceId}
          defaultCenter={{ lat: fallback.lat, lng: fallback.lng }}
          defaultZoom={valid.length <= 1 ? 12 : 10}
          minZoom={3}
          maxZoom={18}
          interactive
          scrollZoom={false}
          doubleClickZoom={false}
          touchZoomRotate={false}
          controls={{ fullscreen: false }}
          showBuildings3D={false}
          className="h-full w-full"
          onClick={onMapClick}
        >
          <WishlistMapCamera
            mapId={mapInstanceId}
            fitPins={fitPins}
            pins={valid}
            selectedId={selectedId}
          />
          <WishlistZoomBridge mapId={mapInstanceId} mapApi={mapApi} />
          <WishlistPickCursor mapId={mapInstanceId} enabled={Boolean(pickingStay)} />
          {stay && hasValidCoords(stay.lat, stay.lng) ? <WishlistStayMarker stay={stay} /> : null}
          {valid.map((pin) => (
            <WishlistPin
              key={pin.id}
              pin={pin}
              selected={pin.id === selectedId}
              onOpen={pickingStay ? undefined : (href) => router.push(href)}
            />
          ))}
        </MapContainer>
        {overlay ? (
          <div className="pointer-events-none absolute left-3 top-3 right-14 z-20">{overlay}</div>
        ) : null}
        <div className="absolute right-3 top-3 z-20 flex flex-col overflow-hidden rounded-lg border border-border/60 bg-background/95 shadow-md">
          <button
            type="button"
            onClick={() => mapApi.current?.zoomBy(1)}
            className="flex h-8 w-8 items-center justify-center text-foreground hover:bg-muted"
            aria-label={t("wishlistZoomIn")}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => mapApi.current?.zoomBy(-1)}
            className="flex h-8 w-8 items-center justify-center border-t border-border/60 text-foreground hover:bg-muted"
            aria-label={t("wishlistZoomOut")}
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </MapProvider>
  )
}
