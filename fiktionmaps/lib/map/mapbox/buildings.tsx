"use client"

import { useEffect, useCallback } from "react"
import { useMap } from "react-map-gl/mapbox"

const LAYER_ID = "3d-buildings"

function findBuildingSource(map: mapboxgl.Map): string | undefined {
  const style = map.getStyle()
  if (!style) return undefined
  const sources = style.sources ?? {}
  for (const [name, src] of Object.entries(sources)) {
    if (src.type === "vector") {
      const url = (src as { url?: string }).url ?? ""
      if (url.includes("mapbox.mapbox-streets") || name === "composite") {
        return name
      }
    }
  }
  return undefined
}

export function MapboxBuildings3D() {
  const maps = useMap()
  const mapRef = maps?.current

  const addBuildingsLayer = useCallback((map: mapboxgl.Map) => {
    try {
      if (map.getLayer(LAYER_ID)) return

      const buildingSource = findBuildingSource(map)
      if (!buildingSource) return

      const layers = map.getStyle().layers
      let labelLayerId: string | undefined
      for (const layer of layers ?? []) {
        if (layer.type === "symbol" && (layer.layout as Record<string, unknown>)?.["text-field"]) {
          labelLayerId = layer.id
          break
        }
      }

      map.addLayer(
        {
          id: LAYER_ID,
          source: buildingSource,
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "height"],
              0, "#1a1f2e",
              50, "#242a3a",
              200, "#2e3546",
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 1,
          },
        },
        labelLayerId,
      )
    } catch { /* style or source not available yet */ }
  }, [])

  useEffect(() => {
    if (!mapRef) return
    let map: mapboxgl.Map
    try {
      map = mapRef.getMap()
    } catch {
      return
    }

    const setup = () => addBuildingsLayer(map)

    if (map.isStyleLoaded()) {
      setup()
    }
    map.on("style.load", setup)

    return () => {
      map.off("style.load", setup)
    }
  }, [mapRef, addBuildingsLayer])

  return null
}
