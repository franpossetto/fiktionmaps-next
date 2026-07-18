"use client"

import {
  startTransition,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { useMap } from "react-map-gl/mapbox"
import {
  MapContainer,
  MapClusterLayer,
  useMapControl,
  useMapLoaded,
  MAP_SPIDERFY_CSS_VARS,
} from "@/lib/map"
import type { ClusterItem } from "@/lib/map"
import { PlaceMarker2d, PlaceMarker3d } from "@/lib/map/pin-markers"
import {
  useMapMarker2dShape,
  useMapMarkerHoverScaleMode,
  useMapMarkerLabelMode,
} from "@/lib/theme-settings-context"
import { ensureXsOnce } from "@/lib/asset-images/ensure-xs-client"
import type { Place } from "@/src/places/domain/place.entity"
import type { City } from "@/src/cities/domain/city.entity"
import { Map3DToggle } from "./map-3d-toggle"
import { MAP_3D_TOGGLE_SLOT_ID } from "./map-slots"

const NavMap = dynamic(
  () => import("./nav-map").then((m) => ({ default: m.NavMap })),
  { ssr: false },
)

const FOCUS_ZOOM = 18

interface MapViewProps {
  city: City
  places: Place[]
  onLocationClick: (location: Place) => void
  selectedLocationId?: string | null
  focusLocationId?: string | null
  /** Right inset (px) so the focused pin sits in the horizontal center of the map area not covered by a side panel. */
  focusPaddingRight?: number
  is3D?: boolean
  onToggle3D?: (is3D: boolean) => void
  onMapLoaded?: () => void
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void
}

function CityCameraController({
  city,
  zoom,
}: {
  city: City
  zoom: number
}) {
  const control = useMapControl()
  const prevCityIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!control) return
    if (prevCityIdRef.current === null) {
      prevCityIdRef.current = city.id
      return
    }
    if (prevCityIdRef.current === city.id) return
    prevCityIdRef.current = city.id

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const tryJump = (attempt: number) => {
      if (cancelled) return
      // duration 0 = instant camera jump; keeps the Mapbox instance alive across cities.
      const ok = control.flyTo({
        center: { lat: city.lat, lng: city.lng },
        zoom,
        duration: 0,
      })
      if (ok) return
      if (attempt < 8) {
        timeoutId = setTimeout(() => tryJump(attempt + 1), 50)
      }
    }
    tryJump(0)
    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [city.id, city.lat, city.lng, zoom, control])

  return null
}

function MapFocusController({
  cityId,
  places,
  focusLocationId,
  focusPaddingRight = 0,
}: {
  cityId: string
  places: Place[]
  focusLocationId: string | null | undefined
  focusPaddingRight?: number
}) {
  const control = useMapControl()
  const prevFocusRef = useRef<string | null | undefined>(null)
  const prevPaddingRef = useRef(0)

  useEffect(() => {
    prevFocusRef.current = null
    prevPaddingRef.current = 0
  }, [cityId])

  useEffect(() => {
    if (!focusLocationId || !control) return
    const loc = places.find((l) => l.id === focusLocationId)
    if (!loc) return
    if (
      prevFocusRef.current === focusLocationId &&
      prevPaddingRef.current === focusPaddingRight
    ) {
      return
    }

    const { lat, lng } = loc.location
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

    const padding =
      focusPaddingRight > 0 ? { right: focusPaddingRight } : undefined

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const tryFly = (attempt: number) => {
      if (cancelled) return
      const ok = control.flyTo({
        center: { lat, lng },
        zoom: FOCUS_ZOOM,
        duration: 1000,
        padding,
      })
      if (ok) {
        prevFocusRef.current = focusLocationId
        prevPaddingRef.current = focusPaddingRight
        return
      }
      if (attempt < 8) {
        timeoutId = setTimeout(() => tryFly(attempt + 1), 100)
      }
    }
    tryFly(0)
    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [focusLocationId, focusPaddingRight, places, control])

  return null
}

const ZOOM_2D_MIN = 12
const ZOOM_2D_MAX = 20
const PITCH_3D_THRESHOLD = 20

type MapPinClusterItem = ClusterItem & { place: Place }

function toClusterItems(
  places: Place[],
  xsByPlaceId: Record<string, string>,
): MapPinClusterItem[] {
  return places.map((p) => {
    const image = xsByPlaceId[p.id] || p.image
    return {
      id: p.id,
      position: { lat: p.location.lat, lng: p.location.lng },
      imageUrl: image,
      place: image === p.image ? p : { ...p, image },
    }
  })
}

function MapLoadReporter({ onLoaded }: { onLoaded?: () => void }) {
  const mapLoaded = useMapLoaded()
  useEffect(() => {
    if (mapLoaded && onLoaded) onLoaded()
  }, [mapLoaded, onLoaded])
  return null
}

function boundsRoughlyEqual(
  a: { west: number; south: number; east: number; north: number },
  b: { west: number; south: number; east: number; north: number },
  epsilon = 1e-5,
): boolean {
  return (
    Math.abs(a.west - b.west) < epsilon &&
    Math.abs(a.south - b.south) < epsilon &&
    Math.abs(a.east - b.east) < epsilon &&
    Math.abs(a.north - b.north) < epsilon
  )
}

function MapBoundsReporter({
  cityId,
  onBoundsChange,
}: {
  cityId: string
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void
}) {
  const maps = useMap()
  const mapRef = maps?.current
  const onBoundsChangeRef = useRef(onBoundsChange)
  const lastBoundsRef = useRef<{ west: number; south: number; east: number; north: number } | null>(
    null,
  )
  /** After a city jump, ignore programmatic moveend until the user pans/zooms. */
  const awaitUserGestureRef = useRef(true)
  onBoundsChangeRef.current = onBoundsChange

  useEffect(() => {
    awaitUserGestureRef.current = true
    lastBoundsRef.current = null
  }, [cityId])

  useEffect(() => {
    if (!mapRef) return
    let map: mapboxgl.Map
    try {
      map = mapRef.getMap()
    } catch {
      return
    }

    const report = () => {
      const emit = onBoundsChangeRef.current
      if (!emit) return
      try {
        const b = map.getBounds()
        if (!b) return
        const next = {
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        }
        if (lastBoundsRef.current && boundsRoughlyEqual(lastBoundsRef.current, next)) return
        lastBoundsRef.current = next
        emit(next)
      } catch {
        // map not ready
      }
    }

    const onMoveEnd = (e: { originalEvent?: Event }) => {
      if (awaitUserGestureRef.current) {
        // Mapbox sets originalEvent only for user-driven gestures.
        if (!e.originalEvent) return
        awaitUserGestureRef.current = false
      }
      report()
    }

    map.on("moveend", onMoveEnd)
    return () => {
      map.off("moveend", onMoveEnd)
    }
  }, [mapRef])

  return null
}

function MapViewPins({
  cityId,
  is3D,
  marker2dShape,
  markerLabelMode,
  markerHoverScale,
  clusterItems,
  selectedLocationId,
  onLocationClick,
  renderMarker,
}: {
  cityId: string
  is3D: boolean
  marker2dShape: "square" | "round"
  markerLabelMode: "always" | "hover"
  markerHoverScale: "normal" | "strong"
  clusterItems: MapPinClusterItem[]
  selectedLocationId: string | null | undefined
  onLocationClick: (location: Place) => void
  renderMarker: (
    item: MapPinClusterItem,
    state: { isSelected: boolean; isHovered: boolean; stackSize?: number },
  ) => ReactNode
}) {
  const mapLoaded = useMapLoaded()
  if (!mapLoaded) return null
  const spiderfyVars = {
    /* Mapbox layer paint.line-color does not accept modern hsl() slash syntax — use rgba */
    [MAP_SPIDERFY_CSS_VARS.legColor]: "rgba(136, 146, 165, 0.85)",
    [MAP_SPIDERFY_CSS_VARS.legWidthPx]: "2",
    [MAP_SPIDERFY_CSS_VARS.radiusPx]: "52",
    [MAP_SPIDERFY_CSS_VARS.hubClearancePx]: "44",
    [MAP_SPIDERFY_CSS_VARS.maxLeaves]: "32",
  } as CSSProperties
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none [&>*]:pointer-events-auto"
      style={spiderfyVars}
    >
      <MapClusterLayer<MapPinClusterItem>
        key={`pins-${cityId}-${is3D ? "3d" : "2d"}-${marker2dShape}-${markerLabelMode}-${markerHoverScale}`}
        items={clusterItems}
        selectedItemId={selectedLocationId}
        onItemClick={(item) => onLocationClick(item.place)}
        renderItem={renderMarker}
        marker2dShape={is3D ? undefined : marker2dShape}
        markerHoverScale={markerHoverScale}
        collocatedSpiderfy={{ enabled: true }}
      />
    </motion.div>
  )
}

function renderMapPin(
  marker2dShape: "square" | "round",
  markerLabelMode: "always" | "hover",
  markerHoverScale: "normal" | "strong",
  is3D: boolean,
  item: MapPinClusterItem,
  state: { isSelected: boolean; isHovered: boolean; stackSize?: number },
) {
  const label = item.place.name
  const props = {
    imageSrc: item.place.image,
    label,
    labelMode: markerLabelMode,
    hoverScaleMode: markerHoverScale,
    isSelected: state.isSelected,
    isHovered: state.isHovered,
    stackSize: state.stackSize,
  }
  if (is3D) return <PlaceMarker3d {...props} />
  return <PlaceMarker2d shape={marker2dShape} {...props} />
}

export function MapView({
  city,
  places,
  onLocationClick,
  selectedLocationId,
  focusLocationId,
  focusPaddingRight = 0,
  is3D = false,
  onToggle3D,
  onMapLoaded,
  onBoundsChange,
}: MapViewProps) {
  const [xsByPlaceId, setXsByPlaceId] = useState<Record<string, string>>({})
  const [primaryMapLoaded, setPrimaryMapLoaded] = useState(false)
  const clusterItems = useMemo(() => toClusterItems(places, xsByPlaceId), [places, xsByPlaceId])
  const marker2dShape = useMapMarker2dShape()
  const markerLabelMode = useMapMarkerLabelMode()
  const markerHoverScale = useMapMarkerHoverScaleMode()
  const renderMarker = useCallback(
    (item: MapPinClusterItem, state: { isSelected: boolean; isHovered: boolean; stackSize?: number }) =>
      renderMapPin(marker2dShape, markerLabelMode, markerHoverScale, is3D, item, state),
    [marker2dShape, markerLabelMode, markerHoverScale, is3D],
  )

  const effectiveZoom = is3D ? 18 : 14
  const handleMapLoaded = useCallback(() => {
    setPrimaryMapLoaded(true)
    onMapLoaded?.()
  }, [onMapLoaded])

  const [viewportCenter, setViewportCenter] = useState(() => ({
    lat: city.lat,
    lng: city.lng,
  }))
  const onCenterChange = useCallback((center: { lat: number; lng: number }) => {
    setViewportCenter(center)
  }, [])
  useEffect(() => {
    setViewportCenter({ lat: city.lat, lng: city.lng })
  }, [city.id, city.lat, city.lng])

  // Lazy xs backfill for place pin thumbs (pins previously never triggered ensure).
  useEffect(() => {
    if (!primaryMapLoaded) return
    let cancelled = false
    const targets = places.filter((place) => {
      const src = place.image?.trim()
      return Boolean(src && !src.startsWith("/") && !xsByPlaceId[place.id])
    })
    if (targets.length === 0) return

    const backfill = async () => {
      const resolved: Array<readonly [string, string]> = []
      // Keep image generation traffic bounded and commit all URLs in one React update.
      for (let i = 0; i < targets.length && !cancelled; i += 4) {
        const batch = targets.slice(i, i + 4)
        const results = await Promise.all(
          batch.map(async (place) => {
            const result = await ensureXsOnce({
              entityType: "place",
              entityId: place.id,
              role: "avatar",
            })
            return result.success ? ([place.id, result.url] as const) : null
          }),
        )
        for (const result of results) {
          if (result) resolved.push(result)
        }
      }
      if (cancelled || resolved.length === 0) return
      startTransition(() => {
        setXsByPlaceId((prev) => {
          const next = { ...prev }
          let changed = false
          for (const [placeId, url] of resolved) {
            if (next[placeId] === url) continue
            next[placeId] = url
            changed = true
          }
          return changed ? next : prev
        })
      })
    }

    const idleId = window.requestIdleCallback(() => void backfill(), { timeout: 3000 })
    return () => {
      cancelled = true
      window.cancelIdleCallback(idleId)
    }
  }, [places, primaryMapLoaded, xsByPlaceId])

  return (
    <MapContainer
      id="main"
      mapKey="main-map"
      defaultCenter={{ lat: city.lat, lng: city.lng }}
      defaultZoom={effectiveZoom}
      minZoom={ZOOM_2D_MIN}
      maxZoom={ZOOM_2D_MAX}
      controls={{ fullscreen: false }}
      showLoadingOverlay={false}
      className="h-full w-full"
      onCenterChange={onCenterChange}
    >
      <MapLoadReporter onLoaded={handleMapLoaded} />
      <CityCameraController city={city} zoom={effectiveZoom} />
      <MapBoundsReporter cityId={city.id} onBoundsChange={onBoundsChange} />
      <MapFocusController
        cityId={city.id}
        places={places}
        focusLocationId={focusLocationId}
        focusPaddingRight={focusPaddingRight}
      />
      <MapViewPins
        cityId={city.id}
        is3D={is3D}
        marker2dShape={marker2dShape}
        markerLabelMode={markerLabelMode}
        markerHoverScale={markerHoverScale}
        clusterItems={clusterItems}
        selectedLocationId={selectedLocationId ?? focusLocationId}
        onLocationClick={onLocationClick}
        renderMarker={renderMarker}
      />
      {onToggle3D && (
        <>
          <SyncPitchTo3D onToggle3D={onToggle3D} />
          <Map3DTogglePortal is3D={is3D} onToggle={onToggle3D} cityId={city.id} />
        </>
      )}
      {primaryMapLoaded && (
        <NavMapPortal city={city} viewportCenter={viewportCenter} places={places} />
      )}
    </MapContainer>
  )
}

function NavMapPortal({
  city,
  viewportCenter,
  places,
}: {
  city: City
  viewportCenter: { lat: number; lng: number }
  places: Place[]
}) {
  const control = useMapControl()
  const onMinimapClick = useCallback(
    (position: { lat: number; lng: number }) => {
      control?.panTo(position)
    },
    [control],
  )
  return (
    <NavMap
      city={city}
      viewportCenter={viewportCenter}
      places={places}
      onMinimapClick={onMinimapClick}
    />
  )
}

function SyncPitchTo3D({ onToggle3D }: { onToggle3D: (is3D: boolean) => void }) {
  const maps = useMap()
  const mapRef = maps?.current
  const onToggle3DRef = useRef(onToggle3D)
  const lastIs3DRef = useRef<boolean | null>(null)
  onToggle3DRef.current = onToggle3D

  useEffect(() => {
    if (!mapRef) return
    let map: mapboxgl.Map
    try {
      map = mapRef.getMap()
    } catch {
      return
    }

    const sync = () => {
      try {
        const pitch = map.getPitch()
        const is3D = pitch > PITCH_3D_THRESHOLD
        if (lastIs3DRef.current === is3D) return
        lastIs3DRef.current = is3D
        onToggle3DRef.current(is3D)
      } catch {
        // map not ready
      }
    }

    sync()
    map.on("moveend", sync)
    return () => {
      map.off("moveend", sync)
    }
  }, [mapRef])

  return null
}

function Map3DTogglePortal({
  is3D,
  onToggle,
  cityId,
}: {
  is3D: boolean
  onToggle: (v: boolean) => void
  cityId: string
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setContainer(document.getElementById(MAP_3D_TOGGLE_SLOT_ID))
  }, [])

  if (!container) return null
  return createPortal(<Map3DToggle is3D={is3D} onToggle={onToggle} cityId={cityId} />, container)
}
