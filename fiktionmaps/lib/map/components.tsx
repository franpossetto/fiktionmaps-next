"use client"

import type { ReactNode } from "react"
import { useMapEngine } from "./context"
import { useMapColorScheme } from "@/hooks/use-map-color-scheme"
import { useMapStyle } from "@/lib/theme-settings-context"
import type {
  MapContainerProps,
  MarkerProps,
  PolylineProps,
  ClusterItem,
  ClusterLayerProps,
  MapControl,
  GeocodingAdapter,
} from "./types"

export function MapProvider({
  children,
  libraries,
}: {
  children: ReactNode
  libraries?: string[]
}) {
  const engine = useMapEngine()
  const Wrapper = engine.Wrapper
  return <Wrapper libraries={libraries}>{children}</Wrapper>
}

export function MapContainer(props: MapContainerProps) {
  const engine = useMapEngine()
  const Container = engine.Container
  const themeColorScheme = useMapColorScheme()
  const themeMapStyle = useMapStyle()
  const colorScheme = props.colorScheme ?? themeColorScheme
  const mapStyle = props.mapStyle ?? themeMapStyle
  return <Container key={props.mapKey} {...props} colorScheme={colorScheme} mapStyle={mapStyle} />
}

export function MapMarker(props: MarkerProps) {
  const engine = useMapEngine()
  const Marker = engine.Marker
  return <Marker {...props} />
}

export function MapPolyline(props: PolylineProps) {
  const engine = useMapEngine()
  const Polyline = engine.Polyline
  return <Polyline {...props} />
}

export function MapClusterLayer<T extends ClusterItem>(props: ClusterLayerProps<T>) {
  const engine = useMapEngine()
  const Cluster = engine.ClusterLayer
  return <Cluster {...(props as unknown as ClusterLayerProps<ClusterItem>)} />
}

export function useMapControl(id?: string): MapControl | null {
  const engine = useMapEngine()
  return engine.useMapControl(id)
}

export function useGeocoding(): GeocodingAdapter {
  const engine = useMapEngine()
  return engine.useGeocoding()
}
