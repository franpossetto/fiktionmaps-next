"use client"

import { useMemo, type ReactNode } from "react"
import { Marker } from "react-map-gl/mapbox"
import { motion } from "framer-motion"
import type { Map as MapboxMap } from "mapbox-gl"
import type { LatLng } from "../types"

const leafSpring = {
  type: "spring" as const,
  stiffness: 340,
  damping: 26,
}

type SpiderfyAnimatedMarkerProps = {
  map: MapboxMap
  center: LatLng
  position: LatLng
  index: number
  stackKey: string
  markerKey: string
  zIndex?: number
  anchor?: "bottom" | "center"
  onClick?: (e: { originalEvent: MouseEvent }) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  children: ReactNode
}

export function SpiderfyAnimatedMarker({
  map,
  center,
  position,
  index,
  stackKey,
  markerKey,
  zIndex = 5,
  anchor = "bottom",
  onClick,
  onMouseEnter,
  onMouseLeave,
  children,
}: SpiderfyAnimatedMarkerProps) {
  const pullFromCenter = useMemo(() => {
    const c = map.project([center.lng, center.lat])
    const t = map.project([position.lng, position.lat])
    return { x: c.x - t.x, y: c.y - t.y }
  }, [map, center.lng, center.lat, position.lng, position.lat])

  return (
    <Marker
      key={markerKey}
      longitude={position.lng}
      latitude={position.lat}
      anchor={anchor}
      style={{ zIndex }}
      onClick={onClick}
    >
      <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <motion.div
          key={`${stackKey}-${markerKey}-open`}
          initial={{ x: pullFromCenter.x, y: pullFromCenter.y, opacity: 0, scale: 0.55 }}
          animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          transition={{
            ...leafSpring,
            delay: 0.04 + index * 0.07,
          }}
        >
          {children}
        </motion.div>
      </div>
    </Marker>
  )
}
