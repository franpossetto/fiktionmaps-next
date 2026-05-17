"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MapRef } from "react-map-gl/mapbox"
import type { Map as MapboxMap } from "mapbox-gl"
import type * as GeoJSON from "geojson"
import type Supercluster from "supercluster"
import type { LatLng } from "./types"
import type { CollocatedSpiderfyTheme } from "./collocated-spiderfy-theme"

export type CollocatedPointGroup<T> =
  | { type: "single"; lat: number; lng: number; item: T }
  | { type: "stack"; key: string; lat: number; lng: number; items: T[] }

type PointFeature<T> = GeoJSON.Feature<GeoJSON.Point, T>

/** Stable key for exact-ish coordinate equality (7 decimals ~ 1.1 cm). */
export function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(7)},${lng.toFixed(7)}`
}

/** Group unclustered point features that share the same coordinate key. */
export function groupCollocatedPointFeatures<T>(features: PointFeature<T>[]): CollocatedPointGroup<T>[] {
  const keyToItems = new Map<string, T[]>()
  const keyOrder: string[] = []
  const keyLatLng = new Map<string, { lat: number; lng: number }>()

  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates
    const item = f.properties as T
    const key = coordKey(lat, lng)
    if (!keyToItems.has(key)) {
      keyToItems.set(key, [])
      keyOrder.push(key)
      keyLatLng.set(key, { lat, lng })
    }
    keyToItems.get(key)!.push(item)
  }

  const out: CollocatedPointGroup<T>[] = []
  for (const key of keyOrder) {
    const items = keyToItems.get(key)!
    const { lat, lng } = keyLatLng.get(key)!
    if (items.length === 1) {
      out.push({ type: "single", lat, lng, item: items[0] })
    } else {
      out.push({ type: "stack", key, lat, lng, items })
    }
  }
  return out
}

/** Radial layout in screen space so legs stay visually correct on pan/zoom. */
export function computeSpiderLngLats(
  map: MapboxMap,
  center: LatLng,
  count: number,
  theme: CollocatedSpiderfyTheme,
): LatLng[] {
  const n = Math.min(Math.max(count, 0), theme.maxLeaves)
  if (n <= 0) return []
  const origin = map.project([center.lng, center.lat])
  const ringPx = theme.radiusPx + theme.hubClearancePx
  const positions: LatLng[] = []
  for (let i = 0; i < n; i += 1) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const x = origin.x + ringPx * Math.cos(angle)
    const y = origin.y + ringPx * Math.sin(angle)
    const ll = map.unproject([x, y])
    positions.push({ lat: ll.lat, lng: ll.lng })
  }
  return positions
}

/**
 * If every leaf of this Supercluster cluster shares the same coordinates, returns
 * that stack so we can spiderfy instead of relying on unclustered point features
 * (duplicate coords often stay a single cluster even at max zoom).
 */
export function getCollocatedClusterStack<T extends GeoJSON.GeoJsonProperties>(
  supercluster: Supercluster<T>,
  clusterId: number,
  maxLeaves = 256,
): { key: string; items: T[]; lat: number; lng: number } | null {
  try {
    const leaves = supercluster.getLeaves(clusterId, maxLeaves)
    if (leaves.length < 2) return null
    const keys = new Set<string>()
    for (const leaf of leaves) {
      const [lng, lat] = leaf.geometry.coordinates
      keys.add(coordKey(lat, lng))
    }
    if (keys.size !== 1) return null
    const [lng, lat] = leaves[0].geometry.coordinates
    const key = coordKey(lat, lng)
    const items = leaves.map((l) => l.properties as T)
    return { key, items, lat, lng }
  } catch {
    return null
  }
}

export interface UseCollocatedSpiderfyResult {
  expandedStackKey: string | null
  collapse: () => void
  toggleStack: (key: string) => void
}

/**
 * Expansion state for collocated stacks + map background click to collapse
 * (marker clicks should stopPropagation so they do not hit the map).
 */
export function useCollocatedSpiderfy(
  mapRef: MapRef | null | undefined,
  options: { enabled: boolean },
): UseCollocatedSpiderfyResult {
  const [expandedStackKey, setExpandedStackKey] = useState<string | null>(null)
  const collapse = useCallback(() => setExpandedStackKey(null), [])
  const toggleStack = useCallback((key: string) => {
    setExpandedStackKey((prev) => (prev === key ? null : key))
  }, [])

  const collapseRef = useRef(collapse)
  collapseRef.current = collapse

  useEffect(() => {
    if (!options.enabled) {
      setExpandedStackKey(null)
    }
  }, [options.enabled])

  useEffect(() => {
    if (!options.enabled || !expandedStackKey || !mapRef) return
    let map: MapboxMap
    try {
      map = mapRef.getMap()
    } catch {
      return
    }
    const onMapClick = () => {
      collapseRef.current()
    }
    map.on("click", onMapClick)
    return () => {
      map.off("click", onMapClick)
    }
  }, [options.enabled, expandedStackKey, mapRef])

  return { expandedStackKey, collapse, toggleStack }
}
