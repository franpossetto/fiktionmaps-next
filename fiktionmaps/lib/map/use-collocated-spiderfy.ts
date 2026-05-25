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

/** Screen-space fan: 2 pins open left/right; more pins spread in a wide arc above the hub. */
export function computeSpiderAngles(count: number): number[] {
  if (count <= 0) return []
  if (count === 1) return [-Math.PI / 2]
  if (count === 2) return [Math.PI, 0]
  const arcSpan = Math.min(Math.PI * 1.3, Math.PI / 4 + (Math.PI / 5) * (count - 1))
  const start = -Math.PI / 2 - arcSpan / 2
  const step = arcSpan / (count - 1)
  return Array.from({ length: count }, (_, i) => start + step * i)
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
  const angles = computeSpiderAngles(n)
  return angles.map((angle) => {
    const x = origin.x + ringPx * Math.cos(angle)
    const y = origin.y + ringPx * Math.sin(angle)
    const ll = map.unproject([x, y])
    return { lat: ll.lat, lng: ll.lng }
  })
}

const SPIDER_LEG_CURVE_SEGMENTS = 24

/**
 * Quadratic curve in screen space. Control point is offset perpendicular to the chord
 * (a collinear CP would produce a straight segment).
 */
export function computeSpiderLegCurveCoordinates(
  map: MapboxMap,
  center: LatLng,
  leaf: LatLng,
  bowPx?: number,
): [number, number][] {
  const o = map.project([center.lng, center.lat])
  const l = map.project([leaf.lng, leaf.lat])
  const dx = l.x - o.x
  const dy = l.y - o.y
  const len = Math.hypot(dx, dy) || 1
  const bow = bowPx ?? Math.min(42, len * 0.38)
  const midX = (o.x + l.x) / 2
  const midY = (o.y + l.y) / 2
  const perpX = -dy / len
  const perpY = dx / len
  let cpX = midX + perpX * bow
  let cpY = midY + perpY * bow
  // Fan opens upward: bow legs toward visual top (smaller screen Y).
  if (cpY > midY) {
    cpX = midX - perpX * bow
    cpY = midY - perpY * bow
  }
  const coords: [number, number][] = []
  for (let i = 0; i <= SPIDER_LEG_CURVE_SEGMENTS; i += 1) {
    const t = i / SPIDER_LEG_CURVE_SEGMENTS
    const u = 1 - t
    const x = u * u * o.x + 2 * u * t * cpX + t * t * l.x
    const y = u * u * o.y + 2 * u * t * cpY + t * t * l.y
    const ll = map.unproject([x, y])
    coords.push([ll.lng, ll.lat])
  }
  return coords
}

/** Truncate curve coordinates for leg draw-in (progress 0–1). */
export function trimSpiderLegCurve(
  coordinates: [number, number][],
  progress: number,
): [number, number][] {
  const t = Math.min(1, Math.max(0, progress))
  if (t <= 0) return [coordinates[0]!]
  const target = Math.max(1, Math.ceil((coordinates.length - 1) * t))
  return coordinates.slice(0, target + 1)
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
