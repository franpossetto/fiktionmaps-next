"use client"

import { useMemo } from "react"
import { useMap } from "react-map-gl/mapbox"
import type { MapControl, LatLng } from "../types"
import type { LngLatBoundsLike } from "mapbox-gl"
import { useMapLoaded } from "../map-loaded-context"

export function useMapboxMapControl(id?: string): MapControl | null {
  const maps = useMap()
  const mapRef = id ? maps?.[id] : maps?.current
  const mapLoaded = useMapLoaded()

  return useMemo(() => {
    if (!mapRef || !mapLoaded) return null

    let map: mapboxgl.Map
    try {
      map = mapRef.getMap()
    } catch {
      return null
    }

    return {
      panTo(position: LatLng) {
        try { map.panTo([position.lng, position.lat]) } catch { /* map not ready */ }
      },
      setZoom(zoom: number) {
        try { map.setZoom(zoom) } catch { /* map not ready */ }
      },
      getZoom() {
        try { return map.getZoom() } catch { return undefined }
      },
      flyTo(options: { center: LatLng; zoom?: number; duration?: number }) {
        try {
          const { center, zoom, duration = 1200 } = options
          map.flyTo({
            center: [center.lng, center.lat],
            zoom: zoom ?? map.getZoom(),
            duration,
            essential: true,
          })
          return true
        } catch {
          return false
        }
      },
      fitBounds(points: LatLng[], padding = 64) {
        try {
          if (points.length === 0) return
          if (points.length === 1) {
            map.panTo([points[0].lng, points[0].lat])
            if (map.getZoom() < 13) map.setZoom(13)
            return
          }

          let minLng = Infinity, maxLng = -Infinity
          let minLat = Infinity, maxLat = -Infinity
          for (const p of points) {
            if (p.lng < minLng) minLng = p.lng
            if (p.lng > maxLng) maxLng = p.lng
            if (p.lat < minLat) minLat = p.lat
            if (p.lat > maxLat) maxLat = p.lat
          }

          const bounds: LngLatBoundsLike = [[minLng, minLat], [maxLng, maxLat]]
          map.fitBounds(bounds, { padding })
        } catch { /* map not ready */ }
      },
      setTilt(tilt: number) {
        try { map.easeTo({ pitch: tilt, duration: 1000 }) } catch { /* map not ready */ }
      },
      getTilt() {
        try { return map.getPitch() } catch { return undefined }
      },
      setHeading(heading: number) {
        try { map.easeTo({ bearing: heading, duration: 1000 }) } catch { /* map not ready */ }
      },
      easeTo(options: { tilt?: number; heading?: number; zoom?: number; duration?: number }) {
        try {
          const opts: { duration?: number; pitch?: number; bearing?: number; zoom?: number } = { duration: options.duration ?? 1000 }
          if (options.tilt != null) opts.pitch = options.tilt
          if (options.heading != null) opts.bearing = options.heading
          if (options.zoom != null) opts.zoom = options.zoom
          map.easeTo(opts)
        } catch { /* map not ready */ }
      },
    }
  }, [mapRef, mapLoaded])
}
