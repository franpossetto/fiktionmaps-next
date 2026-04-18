"use client"

import { useEffect, useState, useCallback, useRef, useMemo, type ReactNode } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { motion } from "framer-motion"
import { useMap } from "react-map-gl/mapbox"
import { MapContainer, MapClusterLayer, useMapControl, useMapLoaded } from "@/lib/map"
import type { ClusterItem } from "@/lib/map"
import type { Location } from "@/src/locations/domain/location.entity"
import type { City } from "@/src/cities/domain/city.entity"
import { Map3DToggle } from "./map-3d-toggle"
import { NavMap, NavMapSlot } from "./nav-map"

const FOCUS_ZOOM = 16

interface MapViewProps {
  city: City
  locations: Location[]
  onLocationClick: (location: Location) => void
  selectedLocationId?: string | null
  /** When set, map flies to this location and zooms in (e.g. from place navigator). */
  focusLocationId?: string | null
  is3D?: boolean
  onToggle3D?: (is3D: boolean) => void
  /** Called when the map has finished loading; use to animate in overlay controls. */
  onMapLoaded?: () => void
  /** Reports current map bounds (west,south,east,north) on move end. */
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void
}

/** Flies the map to a location when focusLocationId changes. Must be rendered inside MapContainer. */
function MapFocusController({
  locations,
  focusLocationId,
}: {
  locations: Location[]
  focusLocationId: string | null | undefined
}) {
  const control = useMapControl()
  const prevFocusRef = useRef<string | null | undefined>(null)

  useEffect(() => {
    if (!focusLocationId || !control) return
    if (prevFocusRef.current === focusLocationId) return
    prevFocusRef.current = focusLocationId
    const loc = locations.find((l) => l.id === focusLocationId)
    if (!loc) return
    control.flyTo({
      center: { lat: loc.lat, lng: loc.lng },
      zoom: FOCUS_ZOOM,
      duration: 1000,
    })
  }, [focusLocationId, locations, control])

  return null
}

const ZOOM_2D_MIN = 12
const ZOOM_2D_MAX = 20
/** Pitch (tilt) above this is considered 3D so pins match when user manually rotates the map */
const PITCH_3D_THRESHOLD = 20

type LocationClusterItem = ClusterItem & { location: Location }

function toClusterItems(locations: Location[]): LocationClusterItem[] {
  return locations.map((loc) => ({
    id: loc.id,
    position: { lat: loc.lat, lng: loc.lng },
    imageUrl: loc.image,
    location: loc,
  }))
}

/** Reports map loaded to parent; must be rendered inside MapContainer. */
function MapLoadReporter({ onLoaded }: { onLoaded?: () => void }) {
  const mapLoaded = useMapLoaded()
  useEffect(() => {
    if (mapLoaded && onLoaded) onLoaded()
  }, [mapLoaded, onLoaded])
  return null
}

function MapBoundsReporter({
  onBoundsChange,
}: {
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void
}) {
  const maps = useMap()
  const mapRef = maps?.current

  useEffect(() => {
    if (!mapRef || !onBoundsChange) return
    let map: mapboxgl.Map
    try {
      map = mapRef.getMap()
    } catch {
      return
    }

    const report = () => {
      try {
        const b = map.getBounds()
        onBoundsChange({
          west: b.getWest(),
          south: b.getSouth(),
          east: b.getEast(),
          north: b.getNorth(),
        })
      } catch {
        // map not ready
      }
    }

    report()
    map.on("load", report)
    map.on("moveend", report)
    return () => {
      map.off("load", report)
      map.off("moveend", report)
    }
  }, [mapRef, onBoundsChange])

  return null
}

/** Renders pins only after the map has loaded, so they animate in after tiles. */
function MapViewPins({
  cityId,
  is3D,
  clusterItems,
  selectedLocationId,
  onLocationClick,
  renderMarker,
}: {
  cityId: string
  is3D: boolean
  clusterItems: LocationClusterItem[]
  selectedLocationId: string | null | undefined
  onLocationClick: (location: Location) => void
  renderMarker: (item: LocationClusterItem, state: { isSelected: boolean; isHovered: boolean }) => ReactNode
}) {
  const mapLoaded = useMapLoaded()
  if (!mapLoaded) return null
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none [&>*]:pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <MapClusterLayer<LocationClusterItem>
        key={`pins-${cityId}-${is3D ? "3d" : "2d"}`}
        items={clusterItems}
        selectedItemId={selectedLocationId}
        onItemClick={(item) => onLocationClick(item.location)}
        renderItem={renderMarker}
      />
    </motion.div>
  )
}

const pinDropSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 18,
}
const pinHoverScale = 1.08
const pinTapScale = 0.96

function renderLocationMarker2D(
  item: LocationClusterItem,
  state: { isSelected: boolean; isHovered: boolean },
) {
  const { isSelected, isHovered } = state
  return (
    <motion.div
      className="group flex flex-col items-center"
      initial={{ scale: 0, opacity: 0, y: -24 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: 0,
        transition: pinDropSpring,
      }}
      whileHover={{ scale: pinHoverScale }}
      whileTap={{ scale: pinTapScale }}
      transition={pinDropSpring}
    >
      <div
        className={`relative overflow-hidden rounded-lg transition-all duration-200 cursor-pointer ${
          isSelected
            ? "h-16 w-16 border-[3px] border-primary shadow-[0_0_0_3px_hsl(36_90%_55%/0.3)] scale-105"
            : isHovered
              ? "h-[60px] w-[60px] border-2 border-primary/70 scale-105"
              : "h-14 w-14 border-2 border-border"
        }`}
        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
      >
        <Image
          src={item.location.image}
          alt={item.location.name}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div
        className={`h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent transition-colors ${
          isSelected
            ? "border-t-primary"
            : isHovered
              ? "border-t-primary/70"
              : "border-t-border"
        }`}
      />
      {(isSelected || isHovered) && (
        <motion.div
          className="mt-0.5 max-w-[140px] truncate rounded-md bg-overlay/95 px-2 py-0.5 text-center text-[10px] font-semibold text-foreground backdrop-blur-sm shadow-lg"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {item.location.name}
        </motion.div>
      )}
    </motion.div>
  )
}

function renderLocationMarker3D(
  item: LocationClusterItem,
  state: { isSelected: boolean; isHovered: boolean },
) {
  const { isSelected, isHovered } = state
  const active = isSelected || isHovered
  const ringColor = isSelected ? "hsl(36, 90%, 55%)" : isHovered ? "hsl(36, 90%, 55%, 0.6)" : "hsl(220, 25%, 35%)"

  return (
    <motion.div
      className="flex flex-col items-center cursor-pointer"
      style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))" }}
      initial={{ scale: 0, opacity: 0, y: -20 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: 0,
        transition: pinDropSpring,
      }}
      whileHover={{ scale: pinHoverScale }}
      whileTap={{ scale: pinTapScale }}
      transition={pinDropSpring}
    >
      {active && (
        <motion.div
          className="mb-1 max-w-[140px] truncate rounded-md bg-overlay/95 px-2 py-0.5 text-center text-[10px] font-semibold text-foreground backdrop-blur-sm shadow-lg"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {item.location.name}
        </motion.div>
      )}
      {/* Outer ring + image bubble */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: isSelected ? 58 : 50,
          height: isSelected ? 58 : 50,
          transition: "all 200ms ease",
        }}
      >
        {/* Glow ring */}
        <div
          className={`absolute inset-0 rounded-full ${active ? "pin3d-spin" : ""}`}
          style={{
            background: `conic-gradient(from 0deg, ${ringColor}, transparent, ${ringColor})`,
            opacity: active ? 1 : 0.6,
          }}
        />
        {/* Inner circle with image */}
        <div
          className="relative overflow-hidden rounded-full"
          style={{
            width: isSelected ? 50 : 42,
            height: isSelected ? 50 : 42,
            border: `2px solid ${ringColor}`,
            transition: "all 200ms ease",
          }}
        >
          <Image
            src={item.location.image}
            alt={item.location.name}
            fill
            className="object-cover"
            sizes="56px"
          />
          {/* Glass overlay */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "linear-gradient(160deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
            }}
          />
        </div>
      </div>
      {/* Stem */}
      <div
        style={{
          width: 2,
          height: isSelected ? 28 : 22,
          background: `linear-gradient(to bottom, ${ringColor}, transparent)`,
          transition: "all 200ms ease",
        }}
      />
      {/* Ground marker */}
      <div className="relative flex items-center justify-center">
        <div
          className="rounded-full"
          style={{
            width: active ? 10 : 6,
            height: active ? 10 : 6,
            background: ringColor,
            boxShadow: active
              ? `0 0 8px 4px ${ringColor}`
              : `0 0 4px 2px ${ringColor}`,
            transition: "all 200ms ease",
          }}
        />
        {active && (
          <div
            className="absolute rounded-full pin3d-ping"
            style={{
              width: 24,
              height: 24,
              border: `1px solid ${ringColor}`,
              opacity: 0.3,
            }}
          />
        )}
      </div>
    </motion.div>
  )
}

export function MapView({
  city,
  locations,
  onLocationClick,
  selectedLocationId,
  focusLocationId,
  is3D = false,
  onToggle3D,
  onMapLoaded,
  onBoundsChange,
}: MapViewProps) {
  const clusterItems = useMemo(() => toClusterItems(locations), [locations])
  const renderMarker = is3D ? renderLocationMarker3D : renderLocationMarker2D

  const effectiveZoom = is3D ? 18 : 14

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

  return (
    <MapContainer
      id="main"
      mapKey={city.id}
      defaultCenter={{ lat: city.lat, lng: city.lng }}
      defaultZoom={effectiveZoom}
      minZoom={ZOOM_2D_MIN}
      maxZoom={ZOOM_2D_MAX}
      controls={{ zoom: true, fullscreen: false }}
      className="h-full w-full"
      onCenterChange={onCenterChange}
    >
      <MapLoadReporter onLoaded={onMapLoaded} />
      <MapBoundsReporter onBoundsChange={onBoundsChange} />
      <MapFocusController locations={locations} focusLocationId={focusLocationId} />
      <MapViewPins
        cityId={city.id}
        is3D={is3D}
        clusterItems={clusterItems}
        selectedLocationId={selectedLocationId}
        onLocationClick={onLocationClick}
        renderMarker={renderMarker}
      />
      {onToggle3D && (
        <>
          <SyncPitchTo3D onToggle3D={onToggle3D} />
          <Map3DTogglePortal is3D={is3D} onToggle={onToggle3D} cityId={city.id} />
        </>
      )}
      <NavMapPortal city={city} viewportCenter={viewportCenter} locations={locations} />
    </MapContainer>
  )
}

const TOGGLE_SLOT_ID = "map-3d-toggle-slot"

export function Map3DToggleSlot() {
  return <div id={TOGGLE_SLOT_ID} />
}

export function MapMinimapSlot() {
  return <NavMapSlot />
}

/** Renders NavMap portaled into the slot; must be inside MapContainer to get main map control. */
function NavMapPortal({
  city,
  viewportCenter,
  locations,
}: {
  city: City
  viewportCenter: { lat: number; lng: number }
  locations: Location[]
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
      locations={locations}
      onMinimapClick={onMinimapClick}
    />
  )
}

/** Syncs is3D state with actual map pitch so pins switch to 3D when user manually tilts/rotates the map */
function SyncPitchTo3D({ onToggle3D }: { onToggle3D: (is3D: boolean) => void }) {
  const maps = useMap()
  const mapRef = maps?.current
  const onToggle3DRef = useRef(onToggle3D)
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
    setContainer(document.getElementById(TOGGLE_SLOT_ID))
  }, [])

  if (!container) return null
  return createPortal(<Map3DToggle is3D={is3D} onToggle={onToggle} cityId={cityId} />, container)
}
