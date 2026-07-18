"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import { useOptionalMapEngine } from "./context"

const MapboxEngineProvider = dynamic(
  () =>
    import("./mapbox-engine-provider").then((m) => ({
      default: m.MapboxEngineProvider,
    })),
  { ssr: false },
)

/**
 * Loads the Mapbox engine on demand when no ancestor provider exists.
 * Keeps mapbox-gl out of the global app shell bundle.
 */
export function EnsureMapEngine({ children }: { children: ReactNode }) {
  const existing = useOptionalMapEngine()
  if (existing) return <>{children}</>
  return <MapboxEngineProvider>{children}</MapboxEngineProvider>
}
