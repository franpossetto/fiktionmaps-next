"use client"

import { useEffect, useRef, useState } from "react"
import type { City } from "@/src/cities/city.domain"
import type { Location } from "@/src/locations"
import { X, AlertCircle } from "lucide-react"

interface Cesium3DTilesProps {
  city: City
  locations: Location[]
  onClose: () => void
}

export function Cesium3DTiles({ city, locations, onClose }: Cesium3DTilesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current) {
      setIsLoading(false)
      return
    }

    const initializeCesium = async () => {
      try {
        const CesiumModule = await import("cesium")

        if (!CesiumModule.Viewer) {
          throw new Error("Cesium module did not load properly")
        }

        const Cesium = CesiumModule as any

        const viewer = new Cesium.Viewer(containerRef.current!, {
          terrain: Cesium.Terrain.fromWorldTerrain(),
          imageryProvider: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: true,
          vrButton: false,
          selectionIndicator: false,
          shadows: true,
        })

        viewer.scene.globe.depthTestAgainstTerrain = true

        // Fly to city (Mapbox-only stack: no Google 3D Tiles; Cesium World Terrain only)
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(city.lng, city.lat, 50000),
          duration: 1.5,
        })

        setIsLoading(false)
      } catch (err) {
        console.error("[v0] Cesium initialization error:", err)
        setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
        setIsLoading(false)
      }
    }

    initializeCesium()
  }, [city.lat, city.lng])

  if (error) {
    return (
      <div className="w-full h-full bg-background flex items-center justify-center">
        <div className="max-w-md p-6 bg-destructive/10 border border-destructive rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive mb-1">3D View Error</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-secondary hover:bg-secondary/80 rounded-lg"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-lg"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-sm">Loading 3D city...</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
