"use client"

import { Marker, useMap } from "react-map-gl/mapbox"
import { useMemo } from "react"
import { useMapLoaded } from "@/lib/map"
import type { MapCluster } from "@/src/places/domain/map-cluster.entity"
import {
  shouldEnterCityFromCluster,
  WORLD_Z_ENTER,
} from "@/lib/map/world-map"
import { WorldClusterPin } from "./world-cluster-pin"

export type WorldEnterCityOpts = {
  /** When set, city sandbox opens with this fiction filter. */
  fictionId?: string
  fictionCoverUrl?: string | null
  fictionTitle?: string | null
}

/**
 * Free-world aggregates.
 * - Click pin → enter dominant city when possible, otherwise zoom in.
 * - At WORLD_Z_ENTER: no further zoom — click enters dominant city when possible.
 */
export function WorldAggregateLayer({
  clusters,
  cityNameById,
  zoomStep = 2,
  onEnterCity,
}: {
  clusters: MapCluster[]
  cityNameById?: Record<string, string>
  zoomStep?: number
  /** Kept for callers; pins stay fully opaque while refetching. */
  stale?: boolean
  /** Return true if the parent handled the click (entered city). */
  onEnterCity?: (cluster: MapCluster, opts?: WorldEnterCityOpts) => boolean
}) {
  const maps = useMap()
  const mapLoaded = useMapLoaded()
  const mapRef = maps?.current
  const names = useMemo(() => cityNameById ?? {}, [cityNameById])

  if (!mapLoaded || clusters.length === 0) return null

  const tryEnter = (cluster: MapCluster, opts?: WorldEnterCityOpts) =>
    Boolean(onEnterCity?.(cluster, opts))

  const zoomIntoCluster = (cluster: MapCluster) => {
    if (!mapRef) return false
    try {
      const map = mapRef.getMap()
      const current = map.getZoom()
      const next = Math.min(current + zoomStep, WORLD_Z_ENTER)
      if (next <= current + 0.05) {
        return false
      }
      map.easeTo({
        center: [cluster.lng, cluster.lat],
        zoom: next,
        duration: 450,
      })
      return true
    } catch {
      return false
    }
  }

  const handleSelectCity = (cluster: MapCluster) => {
    if (shouldEnterCityFromCluster(cluster) && tryEnter(cluster)) return
    if (zoomIntoCluster(cluster)) return
    if (cluster.dominantCityId && tryEnter(cluster)) return
  }

  return (
    <>
      {clusters.map((cluster) => {
        const cityName = cluster.dominantCityId
          ? names[cluster.dominantCityId] ?? null
          : null
        return (
          <Marker
            key={cluster.id}
            longitude={cluster.lng}
            latitude={cluster.lat}
            anchor="bottom"
          >
            <WorldClusterPin
              cluster={cluster}
              cityName={cityName}
              onSelectCity={() => handleSelectCity(cluster)}
            />
          </Marker>
        )
      })}
    </>
  )
}
