"use client"

import type { ReactNode } from "react"
import { MapEngineProvider } from "./context"
import { mapboxEngine } from "./mapbox"

/** Client-only entry that pulls the Mapbox engine chunk. */
export function MapboxEngineProvider({ children }: { children: ReactNode }) {
  return <MapEngineProvider engine={mapboxEngine}>{children}</MapEngineProvider>
}
