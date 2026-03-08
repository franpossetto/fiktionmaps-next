"use client"

import { useEffect, useState } from "react"
import { Source, Layer, useMap } from "react-map-gl/mapbox"
import { useId } from "react"
import type { PolylineProps } from "../types"

export function MapboxPolyline({
  path,
  color = "#00BFDF",
  opacity = 0.95,
  weight = 3,
}: PolylineProps) {
  const sourceId = useId()
  const maps = useMap()
  const mapRef = maps?.current
  const [styleLoaded, setStyleLoaded] = useState(false)

  useEffect(() => {
    if (!mapRef) return
    let map: mapboxgl.Map
    try {
      map = mapRef.getMap()
    } catch {
      return
    }
    const onReady = () => setStyleLoaded(true)
    if (map.isStyleLoaded()) {
      setStyleLoaded(true)
      return
    }
    map.once("load", onReady)
    map.once("style.load", onReady)
    return () => {
      map.off("load", onReady)
      map.off("style.load", onReady)
    }
  }, [mapRef])

  if (path.length < 2) return null
  if (!styleLoaded) return null

  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: path.map((p) => [p.lng, p.lat]),
        },
        properties: {},
      },
    ],
  }

  return (
    <Source id={`polyline-${sourceId}`} type="geojson" data={geojson}>
      <Layer
        id={`polyline-layer-${sourceId}`}
        type="line"
        paint={{
          "line-color": color,
          "line-opacity": opacity,
          "line-width": weight,
        }}
        layout={{
          "line-join": "round",
          "line-cap": "round",
        }}
      />
    </Source>
  )
}
