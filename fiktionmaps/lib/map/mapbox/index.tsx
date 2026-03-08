"use client"

import type { ReactNode } from "react"
import type { MapEngine } from "../context"
import { MapboxContainer } from "./container"
import { MapboxMarker } from "./marker"
import { MapboxPolyline } from "./polyline"
import { MapboxClusterLayer } from "./cluster"
import { useMapboxMapControl } from "./hooks"
import { useMapboxGeocoding } from "./geocoding"

function MapboxWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export const mapboxEngine: MapEngine = {
  type: "mapbox",
  Wrapper: MapboxWrapper,
  Container: MapboxContainer,
  Marker: MapboxMarker,
  Polyline: MapboxPolyline,
  ClusterLayer: MapboxClusterLayer,
  useMapControl: useMapboxMapControl,
  useGeocoding: useMapboxGeocoding,
}
