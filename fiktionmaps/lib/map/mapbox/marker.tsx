"use client"

import { Marker } from "react-map-gl/mapbox"
import type { MarkerProps } from "../types"

export function MapboxMarker({
  position,
  onClick,
  children,
}: MarkerProps) {
  return (
    <Marker
      longitude={position.lng}
      latitude={position.lat}
      onClick={onClick ? (e) => { e.originalEvent.stopPropagation(); onClick() } : undefined}
      anchor="bottom"
    >
      {children}
    </Marker>
  )
}
