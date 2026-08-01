"use client"

import {
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
import type { Place } from "@/src/places/domain/place.entity"
import type { City } from "@/src/cities/domain/city.entity"
import type { MapCluster } from "@/src/places/domain/map-cluster.entity"
import {
  MAP_MODE_CITY,
  MAP_MODE_WORLD,
  WORLD_MAX_ZOOM,
  WORLD_MIN_ZOOM,
  WORLD_Z_ENTER,
  type MapBrowseMode,
} from "@/lib/map/world-map"
import { Map3DToggle } from "./map-3d-toggle"
import { MAP_3D_TOGGLE_SLOT_ID } from "./map-slots"
import { WorldAggregateLayer } from "./world-aggregate-layer"

const NavMap = dynamic(
  () => import("./nav-map").then((m) => ({ default: m.NavMap })),
  { ssr: false },
)

const FOCUS_ZOOM = 18

export type MapViewport = {
  bounds: { west: number; south: number; east: number; north: number }
  zoom: number
  center: { lat: number; lng: number }
}

interface MapViewProps {
  city: City
  places: Place[]
  /** City sandbox (default) vs free-world browse. */
  mode?: MapBrowseMode
  /** Server aggregates — only rendered in world mode. */
  worldClusters?: MapCluster[]
  /** True while a world cluster fetch is in flight (stale pins may still show). */
  worldClustersStale?: boolean
  /** Resolve dominant city labels on world pins. */
  cityNameById?: Record<string, string>
  /** Optional camera when entering world / deep link. */
  initialCamera?: { lat: number; lng: number; zoom: number } | null
  /** Smooth zoom into city when entering from a world cluster. */
  animateCityEntry?: boolean
  onCityEntryAnimationComplete?: () => void
  /** Smooth fly to world overview (toggle). Off for zoom-out exit. */
  animateWorldEntry?: boolean
  /** Called when the world overview fly finishes (or immediately if not animating). */
  onWorldEntryAnimationComplete?: () => void
  /** World cluster: city chrome or fiction cover → enter city sandbox. */
  onWorldClusterEnterCity?: (
    cluster: MapCluster,
    opts?: { fictionId?: string; fictionCoverUrl?: string | null; fictionTitle?: string | null },
  ) => boolean
  onLocationClick: (location: Place) => void
  selectedLocationId?: string | null
  focusLocationId?: string | null
  /** Right inset (px) so the focused pin sits in the horizontal center of the map area not covered by a side panel. */
  focusPaddingRight?: number
  is3D?: boolean
  onToggle3D?: (is3D: boolean) => void
  onMapLoaded?: () => void
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void
  onViewportChange?: (viewport: MapViewport) => void
}

function CityCameraController({
  city,
  zoom,
  enabled,
  animate = false,
  onAnimateComplete,
}: {
  city: City
  zoom: number
  enabled: boolean
  /** Smooth zoom/pan when entering a city from free-world. */
  animate?: boolean
  onAnimateComplete?: () => void
}) {
  const control = useMapControl()
  const prevCityIdRef = useRef<string | null>(null)
  const onAnimateCompleteRef = useRef(onAnimateComplete)
  onAnimateCompleteRef.current = onAnimateComplete

  useEffect(() => {
    if (!enabled) {
      // Next city entry (e.g. from world) should always be allowed to fly.
      prevCityIdRef.current = null
      return
    }
    if (!control) return

    const prev = prevCityIdRef.current
    const cityChanged = prev !== null && prev !== city.id
    const fromWorld = prev === null
    prevCityIdRef.current = city.id

    // Initial city sandbox mount: camera already matches defaultCenter.
    if (!animate && fromWorld) return
    if (!animate && !cityChanged) return

    // One-shot fly; ignore subsequent effect re-runs for the same animate entry.
    const duration = animate ? 1100 : 0
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let doneId: ReturnType<typeof setTimeout> | undefined
    let didFly = false

    const tryFly = (attempt: number) => {
      if (cancelled || didFly) return
      const ok = control.flyTo({
        center: { lat: city.lat, lng: city.lng },
        zoom,
        duration,
      })
      if (ok) {
        didFly = true
        if (animate) {
          doneId = setTimeout(() => onAnimateCompleteRef.current?.(), duration + 50)
        }
        return
      }
      if (attempt < 8) {
        timeoutId = setTimeout(() => tryFly(attempt + 1), 50)
      }
    }
    tryFly(0)
    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      if (doneId !== undefined) clearTimeout(doneId)
    }
    // Intentionally omit `animate` flipping false from re-triggering a second fly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.id, city.lat, city.lng, zoom, control, enabled, animate === true])

  return null
}

/** Fly out to globe overview when entering free-world mode. */
function WorldCameraController({
  enabled,
  camera,
  animate = false,
  onAnimateComplete,
}: {
  enabled: boolean
  camera: { lat: number; lng: number; zoom: number } | null
  /** Smooth overview fly (toggle). Zoom-out exit stays put — no redundant fly. */
  animate?: boolean
  onAnimateComplete?: () => void
}) {
  const control = useMapControl()
  const prevEnabledRef = useRef(false)
  const onAnimateCompleteRef = useRef(onAnimateComplete)
  onAnimateCompleteRef.current = onAnimateComplete

  useEffect(() => {
    const wasEnabled = prevEnabledRef.current
    prevEnabledRef.current = enabled
    if (!enabled || !control || !camera) return
    if (wasEnabled) return
    if (!animate) {
      onAnimateCompleteRef.current?.()
      return
    }

    const duration = 1100
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let doneId: ReturnType<typeof setTimeout> | undefined
    const tryFly = (attempt: number) => {
      if (cancelled) return
      const ok = control.flyTo({
        center: { lat: camera.lat, lng: camera.lng },
        zoom: camera.zoom,
        duration,
      })
      if (ok) {
        doneId = setTimeout(() => onAnimateCompleteRef.current?.(), duration + 50)
        return
      }
      if (attempt < 8) {
        timeoutId = setTimeout(() => tryFly(attempt + 1), 50)
      } else {
        onAnimateCompleteRef.current?.()
      }
    }
    tryFly(0)
    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      if (doneId !== undefined) clearTimeout(doneId)
    }
  }, [enabled, camera?.lat, camera?.lng, camera?.zoom, control, animate])

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

const PITCH_3D_THRESHOLD = 20

type MapPinClusterItem = ClusterItem & { place: Place }

/** Pin thumbs come from place.image (server prefers xs → sm). No client ensureXs. */
function toClusterItems(places: Place[]): MapPinClusterItem[] {
  return places.map((p) => ({
    id: p.id,
    position: { lat: p.location.lat, lng: p.location.lng },
    imageUrl: p.image,
    place: p,
  }))
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
  resetKey,
  immediate,
  unlockKey,
  onBoundsChange,
  onViewportChange,
}: {
  resetKey: string
  /** When true, emit on load / programmatic moves (world mode needs first paint data). */
  immediate: boolean
  /** After city-entry fly finishes, parent bumps this so we publish city bounds once. */
  unlockKey?: string
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void
  onViewportChange?: (viewport: MapViewport) => void
}) {
  const maps = useMap()
  const mapLoaded = useMapLoaded()
  const mapRef = maps?.current
  const onBoundsChangeRef = useRef(onBoundsChange)
  const onViewportChangeRef = useRef(onViewportChange)
  const lastBoundsRef = useRef<{ west: number; south: number; east: number; north: number } | null>(
    null,
  )
  const lastZoomRef = useRef<number | null>(null)
  /** After a city jump, ignore programmatic moveend until the user pans/zooms. */
  const awaitUserGestureRef = useRef(!immediate)
  const reportRef = useRef<() => void>(() => {})
  onBoundsChangeRef.current = onBoundsChange
  onViewportChangeRef.current = onViewportChange

  useEffect(() => {
    awaitUserGestureRef.current = !immediate
    lastBoundsRef.current = null
    lastZoomRef.current = null
  }, [resetKey, immediate])

  useEffect(() => {
    if (!unlockKey || immediate) return
    awaitUserGestureRef.current = false
    reportRef.current()
  }, [unlockKey, immediate])

  useEffect(() => {
    // useMap().current can be set without a React re-render — gate on mapLoaded.
    if (!mapLoaded || !mapRef) return
    let map: mapboxgl.Map
    try {
      map = mapRef.getMap()
    } catch {
      return
    }

    const report = () => {
      const emitBounds = onBoundsChangeRef.current
      const emitVp = onViewportChangeRef.current
      if (!emitBounds && !emitVp) return
      try {
        const b = map.getBounds()
        if (!b) return
        const next = {
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        }
        const zoom = map.getZoom()
        const center = map.getCenter()
        const boundsSame =
          lastBoundsRef.current && boundsRoughlyEqual(lastBoundsRef.current, next)
        const zoomSame =
          lastZoomRef.current != null && Math.abs(lastZoomRef.current - zoom) < 1e-3
        if (boundsSame && zoomSame) return
        lastBoundsRef.current = next
        lastZoomRef.current = zoom
        emitBounds?.(next)
        emitVp?.({
          bounds: next,
          zoom,
          center: { lat: center.lat, lng: center.lng },
        })
      } catch {
        // map not ready
      }
    }
    reportRef.current = report

    const onMoveEnd = (e: { originalEvent?: Event }) => {
      if (awaitUserGestureRef.current) {
        // Mapbox sets originalEvent only for user-driven gestures.
        if (!e.originalEvent) return
        awaitUserGestureRef.current = false
      }
      report()
    }

    map.on("moveend", onMoveEnd)
    if (immediate) {
      // World mode: first paint needs data without waiting for a user gesture.
      report()
      const t = window.setTimeout(report, 100)
      return () => {
        window.clearTimeout(t)
        map.off("moveend", onMoveEnd)
      }
    }
    return () => {
      map.off("moveend", onMoveEnd)
    }
  }, [mapLoaded, mapRef, immediate, resetKey])

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
    imageFocus: item.place.imageFocus,
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
  mode = MAP_MODE_CITY,
  worldClusters = [],
  worldClustersStale = false,
  cityNameById,
  initialCamera = null,
  animateCityEntry = false,
  onCityEntryAnimationComplete,
  animateWorldEntry = false,
  onWorldEntryAnimationComplete,
  onWorldClusterEnterCity,
  onLocationClick,
  selectedLocationId,
  focusLocationId,
  focusPaddingRight = 0,
  is3D = false,
  onToggle3D,
  onMapLoaded,
  onBoundsChange,
  onViewportChange,
}: MapViewProps) {
  const isWorld = mode === MAP_MODE_WORLD
  const [primaryMapLoaded, setPrimaryMapLoaded] = useState(false)
  /** Defer second Mapbox (minimap) until browser idle after primary load. */
  const [minimapReady, setMinimapReady] = useState(false)
  /** World = aggregates only; city = place pins from city cache. */
  const showPlacePins = !isWorld
  const showWorldClusters = isWorld && worldClusters.length > 0
  const clusterItems = useMemo(
    () => (showPlacePins ? toClusterItems(places) : []),
    [places, showPlacePins],
  )

  // Dev-only tripwire: catches a future regression of the World/City pin-mixing bug class
  // (see docs/plans/free-world.md / docs/plans/free-world-perf.md) without waiting for a user report.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    if (showPlacePins && showWorldClusters) {
      console.warn(
        "[MapView] Both place pins and world clusters are set to render in the same frame.",
      )
    }
    if (!showPlacePins) return
    const wrongCity = places.find((p) => p.location.cityId && p.location.cityId !== city.id)
    if (wrongCity) {
      console.warn(
        `[MapView] Place "${wrongCity.id}" belongs to city "${wrongCity.location.cityId}" but the map is showing city "${city.id}".`,
      )
    }
  }, [showPlacePins, showWorldClusters, places, city.id])
  const marker2dShape = useMapMarker2dShape()
  const markerLabelMode = useMapMarkerLabelMode()
  const markerHoverScale = useMapMarkerHoverScaleMode()
  const renderMarker = useCallback(
    (item: MapPinClusterItem, state: { isSelected: boolean; isHovered: boolean; stackSize?: number }) =>
      renderMapPin(marker2dShape, markerLabelMode, markerHoverScale, is3D, item, state),
    [marker2dShape, markerLabelMode, markerHoverScale, is3D],
  )

  const cityZoom = is3D ? 18 : 14
  const effectiveZoom = isWorld
    ? (initialCamera?.zoom ?? 4)
    : cityZoom
  const defaultCenter = initialCamera
    ? { lat: initialCamera.lat, lng: initialCamera.lng }
    : { lat: city.lat, lng: city.lng }
  /**
   * World: cap inward zoom at WORLD_Z_ENTER (must click cluster to enter city).
   * City: full zoom range; exit uses Z_EXIT hysteresis, not a hard min.
   * Limits applied imperatively in MapboxContainer (safe across mode switches).
   */
  const minZoom = WORLD_MIN_ZOOM
  const maxZoom = isWorld ? WORLD_Z_ENTER : WORLD_MAX_ZOOM
  const handleMapLoaded = useCallback(() => {
    setPrimaryMapLoaded(true)
    onMapLoaded?.()
  }, [onMapLoaded])

  useEffect(() => {
    if (!primaryMapLoaded || isWorld) {
      setMinimapReady(false)
      return
    }
    let cancelled = false
    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const enable = () => {
      if (!cancelled) setMinimapReady(true)
    }
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(enable, { timeout: 2500 })
    } else {
      timeoutId = setTimeout(enable, 1500)
    }
    return () => {
      cancelled = true
      if (idleId != null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [primaryMapLoaded, isWorld])

  const [viewportCenter, setViewportCenter] = useState(() => ({
    lat: defaultCenter.lat,
    lng: defaultCenter.lng,
  }))
  const onCenterChange = useCallback((center: { lat: number; lng: number }) => {
    setViewportCenter(center)
  }, [])
  useEffect(() => {
    if (isWorld) return
    setViewportCenter({ lat: city.lat, lng: city.lng })
  }, [city.id, city.lat, city.lng, isWorld])

  const boundsResetKey = isWorld ? `world-${mode}` : city.id

  return (
    <MapContainer
      id="main"
      mapKey="main-map"
      defaultCenter={defaultCenter}
      defaultZoom={effectiveZoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      controls={{ fullscreen: false }}
      showLoadingOverlay={false}
      className="h-full w-full"
      onCenterChange={onCenterChange}
    >
      <MapLoadReporter onLoaded={handleMapLoaded} />
      <CityCameraController
        city={city}
        zoom={cityZoom}
        enabled={!isWorld}
        animate={animateCityEntry}
        onAnimateComplete={onCityEntryAnimationComplete}
      />
      <WorldCameraController
        enabled={isWorld}
        camera={isWorld ? initialCamera : null}
        animate={animateWorldEntry}
        onAnimateComplete={onWorldEntryAnimationComplete}
      />
      <MapBoundsReporter
        resetKey={boundsResetKey}
        immediate={isWorld}
        unlockKey={
          !isWorld && !animateCityEntry ? `city-ready-${city.id}` : undefined
        }
        onBoundsChange={onBoundsChange}
        onViewportChange={onViewportChange}
      />
      <MapFocusController
        cityId={city.id}
        places={places}
        focusLocationId={focusLocationId}
        focusPaddingRight={focusPaddingRight}
      />
      {showWorldClusters && (
        <WorldAggregateLayer
          clusters={worldClusters}
          cityNameById={cityNameById}
          stale={worldClustersStale}
          onEnterCity={onWorldClusterEnterCity}
        />
      )}
      {showPlacePins && (
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
      )}
      {onToggle3D && !isWorld && (
        <>
          <SyncPitchTo3D onToggle3D={onToggle3D} />
          <Map3DTogglePortal is3D={is3D} onToggle={onToggle3D} cityId={city.id} />
        </>
      )}
      {minimapReady && !isWorld && (
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
