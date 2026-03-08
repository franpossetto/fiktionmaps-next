"use client"

import { createContext, useContext, type ComponentType, type ReactNode } from "react"
import type {
  MapContainerProps,
  MarkerProps,
  PolylineProps,
  ClusterItem,
  ClusterLayerProps,
  MapControl,
  GeocodingAdapter,
} from "./types"

// Add new provider identifiers here when introducing additional engines (e.g. "here")
export type MapEngineType = "mapbox"

export interface MapEngine {
  type: MapEngineType
  Wrapper: ComponentType<{ children: ReactNode; libraries?: string[] }>
  Container: ComponentType<MapContainerProps>
  Marker: ComponentType<MarkerProps>
  Polyline: ComponentType<PolylineProps>
  ClusterLayer: ComponentType<ClusterLayerProps<ClusterItem>>
  useMapControl: (id?: string) => MapControl | null
  useGeocoding: () => GeocodingAdapter
}

const MapEngineContext = createContext<MapEngine | null>(null)

export function useMapEngine(): MapEngine {
  const engine = useContext(MapEngineContext)
  if (!engine) {
    throw new Error("useMapEngine must be used within a MapEngineProvider")
  }
  return engine
}

interface MapEngineProviderProps {
  engine: MapEngine
  children: ReactNode
}

export function MapEngineProvider({ engine, children }: MapEngineProviderProps) {
  return (
    <MapEngineContext.Provider value={engine}>
      {children}
    </MapEngineContext.Provider>
  )
}
