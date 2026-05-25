"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Layer, Marker, Source, useMap } from "react-map-gl/mapbox"
import Supercluster from "supercluster"
import type { ClusterItem, ClusterLayerProps, LatLng } from "../types"
import { ClusterMarker2d } from "../pin-markers"
import { resolveCollocatedSpiderfyTheme } from "../collocated-spiderfy-theme"
import type { CollocatedSpiderfyTheme } from "../collocated-spiderfy-theme"
import {
  computeSpiderLegCurveCoordinates,
  computeSpiderLngLats,
  getCollocatedClusterStack,
  groupCollocatedPointFeatures,
  trimSpiderLegCurve,
  useCollocatedSpiderfy,
  type CollocatedPointGroup,
} from "../use-collocated-spiderfy"
import { SpiderfyAnimatedMarker } from "./spiderfy-animated-marker"
import type { Map as MapboxMap } from "mapbox-gl"
import { motion } from "framer-motion"

type PointFeature<T> = GeoJSON.Feature<GeoJSON.Point, T>
type ClusterFeature = Supercluster.ClusterFeature<Supercluster.AnyProps>

function isClusterFeature(f: ClusterFeature | PointFeature<ClusterItem>): f is ClusterFeature {
  return "cluster" in f.properties && Boolean(f.properties.cluster)
}

function isCollocatedSpiderfyEnabled(
  prop: ClusterLayerProps["collocatedSpiderfy"],
): boolean {
  if (prop === true) return true
  if (prop === false || prop === undefined) return false
  return prop.enabled !== false
}

function getSpiderfyThemeOverrides(
  prop: ClusterLayerProps["collocatedSpiderfy"],
): Partial<CollocatedSpiderfyTheme> {
  if (prop && typeof prop === "object" && prop.theme) return prop.theme
  return {}
}

function themesEqual(a: CollocatedSpiderfyTheme, b: CollocatedSpiderfyTheme): boolean {
  return (
    a.legColor === b.legColor &&
    a.legWidthPx === b.legWidthPx &&
    a.radiusPx === b.radiusPx &&
    a.hubClearancePx === b.hubClearancePx &&
    a.maxLeaves === b.maxLeaves
  )
}

function spiderLegSourceId(stackKey: string): string {
  return `collocated-spider-legs-${encodeURIComponent(stackKey).replace(/%/g, "_")}`
}

function clusterHoverId(clusterId: number): string {
  return `cluster:${clusterId}`
}

export function MapboxClusterLayer<T extends ClusterItem>({
  items,
  selectedItemId,
  onItemClick,
  renderItem,
  marker2dShape = "round",
  markerHoverScale = "normal",
  maxZoom = 20,
  radius = 70,
  collocatedSpiderfy,
}: ClusterLayerProps<T>) {
  const maps = useMap()
  const mapRef = maps.current
  const spiderfyEnabled = isCollocatedSpiderfyEnabled(collocatedSpiderfy)
  const themeOverridesKey = useMemo(() => {
    const o = getSpiderfyThemeOverrides(collocatedSpiderfy)
    return JSON.stringify(o)
  }, [collocatedSpiderfy])
  const themeOverrides = useMemo(
    () => JSON.parse(themeOverridesKey) as Partial<CollocatedSpiderfyTheme>,
    [themeOverridesKey],
  )
  const themeAnchorRef = useRef<HTMLDivElement>(null)
  const [resolvedTheme, setResolvedTheme] = useState<CollocatedSpiderfyTheme>(() =>
    resolveCollocatedSpiderfyTheme(themeOverrides),
  )

  useLayoutEffect(() => {
    const root = themeAnchorRef.current ?? null
    setResolvedTheme((prev) => {
      const next = resolveCollocatedSpiderfyTheme(themeOverrides, root)
      return themesEqual(prev, next) ? prev : next
    })
  }, [themeOverrides])

  const { expandedStackKey, collapse, toggleStack } = useCollocatedSpiderfy(mapRef, {
    enabled: spiderfyEnabled,
  })

  const [clusters, setClusters] = useState<Array<ClusterFeature | PointFeature<T>>>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoveredStackKey, setHoveredStackKey] = useState<string | null>(null)
  const [styleLoaded, setStyleLoaded] = useState(false)
  const [spiderLayoutTick, setSpiderLayoutTick] = useState(0)
  const [spiderReveal, setSpiderReveal] = useState(0)

  const supercluster = useMemo(() => {
    const sc = new Supercluster<T>({ maxZoom, radius })
    const points: Array<PointFeature<T>> = items.map((item) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [item.position.lng, item.position.lat],
      },
      properties: item,
    }))
    sc.load(points)
    return sc
  }, [items, maxZoom, radius])

  const superclusterRef = useRef(supercluster)
  superclusterRef.current = supercluster

  const updateClusters = useCallback((): boolean => {
    if (!mapRef) return false
    try {
      const map = mapRef.getMap()
      const bounds = map.getBounds()
      if (!bounds) return false
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]
      const zoom = Math.floor(map.getZoom())
      setClusters(superclusterRef.current.getClusters(bbox, zoom))
      return true
    } catch {
      return false
    }
  }, [mapRef])

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const maxAttempts = 20

    const tryUpdate = (attempt: number) => {
      if (cancelled) return
      const ready = updateClusters()
      if (ready || attempt >= maxAttempts) return
      timeoutId = setTimeout(() => tryUpdate(attempt + 1), 80)
    }

    tryUpdate(0)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [updateClusters, supercluster, items.length])

  useEffect(() => {
    if (!mapRef) return
    try {
      const map = mapRef.getMap()
      const onMove = () => {
        updateClusters()
      }
      map.on("moveend", onMove)
      map.on("load", onMove)
      map.on("idle", onMove)
      if (!map.isStyleLoaded()) {
        map.once("styledata", onMove)
      }
      return () => {
        map.off("moveend", onMove)
        map.off("load", onMove)
        map.off("idle", onMove)
        map.off("styledata", onMove)
      }
    } catch {
      // Map not initialized yet
    }
  }, [mapRef, updateClusters])

  useEffect(() => {
    if (!mapRef || items.length === 0) return
    try {
      const map = mapRef.getMap()
      const onIdle = () => updateClusters()
      map.once("idle", onIdle)
      return () => {
        map.off("idle", onIdle)
      }
    } catch {
      // Map not initialized yet
    }
  }, [mapRef, items.length, supercluster, updateClusters])

  useEffect(() => {
    if (!mapRef) return
    try {
      const map = mapRef.getMap()
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
    } catch {
      return
    }
  }, [mapRef])

  const rawPointFeatures = useMemo(
    () => clusters.filter((f) => !isClusterFeature(f)) as PointFeature<T>[],
    [clusters],
  )

  const pointGroups = useMemo(() => {
    if (!spiderfyEnabled) return [] as CollocatedPointGroup<T>[]
    return groupCollocatedPointFeatures(rawPointFeatures)
  }, [spiderfyEnabled, rawPointFeatures])

  const clusterFeatures = useMemo(
    () => clusters.filter((f) => isClusterFeature(f)),
    [clusters],
  )

  /** Stack shown while expanded: from unclustered stacks or from a Supercluster cluster whose leaves share one point. */
  const expandedStackData = useMemo((): {
    key: string
    items: T[]
    lat: number
    lng: number
  } | null => {
    if (!spiderfyEnabled || !expandedStackKey) return null
    const fromPoints = pointGroups.find(
      (g): g is Extract<CollocatedPointGroup<T>, { type: "stack" }> =>
        g.type === "stack" && g.key === expandedStackKey,
    )
    if (fromPoints) {
      return {
        key: fromPoints.key,
        items: fromPoints.items,
        lat: fromPoints.lat,
        lng: fromPoints.lng,
      }
    }
    for (const f of clusterFeatures) {
      const clusterId = f.id as number
      const collocated = getCollocatedClusterStack(supercluster, clusterId)
      if (collocated && collocated.key === expandedStackKey) {
        return collocated
      }
    }
    return null
  }, [spiderfyEnabled, expandedStackKey, pointGroups, clusterFeatures, supercluster])

  useEffect(() => {
    if (!spiderfyEnabled || !expandedStackKey) return
    if (!expandedStackData || expandedStackData.items.length < 2) {
      collapse()
    }
  }, [spiderfyEnabled, expandedStackKey, expandedStackData, collapse])

  useEffect(() => {
    if (!spiderfyEnabled || !expandedStackKey || !mapRef) return
    let map: MapboxMap
    try {
      map = mapRef.getMap()
    } catch {
      return
    }
    const bump = () => setSpiderLayoutTick((n) => n + 1)
    map.on("moveend", bump)
    map.on("zoomend", bump)
    map.on("idle", bump)
    return () => {
      map.off("moveend", bump)
      map.off("zoomend", bump)
      map.off("idle", bump)
    }
  }, [spiderfyEnabled, expandedStackKey, mapRef])

  useEffect(() => {
    if (!expandedStackKey) {
      setSpiderReveal(0)
      return
    }
    let frame = 0
    let start: number | null = null
    const durationMs = 520
    const tick = (now: number) => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 3
      setSpiderReveal(eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [expandedStackKey])

  const spiderLegGeoJson = useMemo(() => {
    void spiderLayoutTick
    if (!spiderfyEnabled || !expandedStackData || !mapRef || !styleLoaded) return null
    let map: MapboxMap
    try {
      map = mapRef.getMap()
    } catch {
      return null
    }
    const center: LatLng = { lat: expandedStackData.lat, lng: expandedStackData.lng }
    const leafCount = Math.min(expandedStackData.items.length, resolvedTheme.maxLeaves)
    const leafLngLats = computeSpiderLngLats(map, center, leafCount, resolvedTheme)
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = leafLngLats.map((leaf) => {
      const curve = computeSpiderLegCurveCoordinates(map, center, leaf)
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: trimSpiderLegCurve(curve, spiderReveal),
        },
        properties: {},
      }
    })
    return {
      type: "FeatureCollection" as const,
      features,
    }
  }, [
    spiderfyEnabled,
    expandedStackData,
    mapRef,
    resolvedTheme,
    styleLoaded,
    spiderLayoutTick,
    spiderReveal,
  ])

  const clusterOnlyExpanded =
    spiderfyEnabled &&
    expandedStackData &&
    !pointGroups.some((g) => g.type === "stack" && g.key === expandedStackData.key)

  const renderExpandedSpiderUi = (data: { key: string; items: T[]; lat: number; lng: number }) => {
    let map: MapboxMap | null = null
    try {
      map = mapRef?.getMap() ?? null
    } catch {
      map = null
    }
    const center: LatLng = { lat: data.lat, lng: data.lng }
    const visibleItems = data.items.slice(0, resolvedTheme.maxLeaves)
    const leafLngLats =
      map && styleLoaded
        ? computeSpiderLngLats(map, center, visibleItems.length, resolvedTheme)
        : []

    const hub = (
      <Marker
        key={`stack-hub-${data.key}`}
        longitude={data.lng}
        latitude={data.lat}
        anchor="bottom"
        style={{ zIndex: 10 }}
        onClick={(e) => {
          e.originalEvent.stopPropagation()
          toggleStack(data.key)
        }}
      >
        <motion.div
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-border bg-background/95 text-xs font-bold shadow-md"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
        >
          ×
        </motion.div>
      </Marker>
    )

    const leaves =
      map && styleLoaded
        ? visibleItems.map((item, index) => {
            const pos = leafLngLats[index] ?? center
            const isSelected = selectedItemId === item.id
            const isHovered = hoveredId === item.id
            return (
              <SpiderfyAnimatedMarker
                key={`stack-leaf-${data.key}-${item.id}`}
                map={map}
                center={center}
                position={pos}
                index={index}
                stackKey={data.key}
                markerKey={`stack-leaf-${data.key}-${item.id}`}
                onClick={
                  onItemClick
                    ? (e) => {
                        e.originalEvent.stopPropagation()
                        onItemClick(item)
                      }
                    : undefined
                }
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {renderItem(item, { isSelected, isHovered })}
              </SpiderfyAnimatedMarker>
            )
          })
        : []

    return (
      <span key={`stack-expanded-${data.key}`} style={{ display: "contents" }}>
        {hub}
        {leaves}
      </span>
    )
  }

  const renderClusterMarkers = clusterFeatures.map((feature) => {
    const [lng, lat] = feature.geometry.coordinates
    const clusterId = feature.id as number
    const count = feature.properties.point_count as number
    let imageUrl = "/placeholder.jpg"
    try {
      const leaves = supercluster.getLeaves(clusterId, 1)
      imageUrl = leaves[0]?.properties?.imageUrl || "/placeholder.jpg"
    } catch {
      // Cluster ID can be stale if supercluster was recreated (e.g. items changed)
    }
    const isHovered = hoveredId === clusterHoverId(clusterId)

    const collocated =
      spiderfyEnabled ? getCollocatedClusterStack(supercluster, clusterId) : null
    if (collocated && expandedStackKey === collocated.key) {
      return null
    }

    return (
      <Marker
        key={`cluster-${clusterId}`}
        longitude={lng}
        latitude={lat}
        anchor="bottom"
        onClick={(e) => {
          e.originalEvent.stopPropagation()
          if (!mapRef) return
          if (spiderfyEnabled) {
            const stack = getCollocatedClusterStack(supercluster, clusterId)
            if (stack && stack.items.length >= 2) {
              toggleStack(stack.key)
              return
            }
          }
          try {
            const zoom = supercluster.getClusterExpansionZoom(clusterId)
            mapRef.getMap().flyTo({ center: [lng, lat], zoom })
          } catch {
            const map = mapRef.getMap()
            map.flyTo({
              center: [lng, lat],
              zoom: Math.min(map.getZoom() + 2, maxZoom),
            })
          }
        }}
      >
        <div
          className="flex cursor-pointer flex-col items-center"
          onMouseEnter={() => setHoveredId(clusterHoverId(clusterId))}
          onMouseLeave={() => setHoveredId(null)}
        >
          <ClusterMarker2d
            shape={marker2dShape}
            imageUrl={imageUrl}
            count={count}
            isHovered={isHovered}
            hoverScaleMode={markerHoverScale}
          />
        </div>
      </Marker>
    )
  })

  const renderPointMarkersLegacy = rawPointFeatures.map((feature) => {
    const [lng, lat] = feature.geometry.coordinates
    const item = feature.properties as T
    const isSelected = selectedItemId === item.id
    const isHovered = hoveredId === item.id
    return (
      <Marker
        key={item.id}
        longitude={lng}
        latitude={lat}
        anchor="bottom"
        onClick={
          onItemClick
            ? (e) => {
                e.originalEvent.stopPropagation()
                onItemClick(item)
              }
            : undefined
        }
      >
        <div onMouseEnter={() => setHoveredId(item.id)} onMouseLeave={() => setHoveredId(null)}>
          {renderItem(item, { isSelected, isHovered })}
        </div>
      </Marker>
    )
  })

  const renderPointMarkersSpiderfy = pointGroups.map((group) => {
        if (group.type === "single") {
          const item = group.item
          const isSelected = selectedItemId === item.id
          const isHovered = hoveredId === item.id
          return (
            <Marker
              key={item.id}
              longitude={group.lng}
              latitude={group.lat}
              anchor="bottom"
              onClick={
                onItemClick
                  ? (e) => {
                      e.originalEvent.stopPropagation()
                      onItemClick(item)
                    }
                  : undefined
              }
            >
              <div
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {renderItem(item, { isSelected, isHovered })}
              </div>
            </Marker>
          )
        }

        const expanded = expandedStackKey === group.key
        if (!expanded) {
          const rep = group.items[0]
          const anySelected = group.items.some((i) => i.id === selectedItemId)
          const isHovered = hoveredStackKey === group.key
          return (
            <Marker
              key={`stack-${group.key}`}
              longitude={group.lng}
              latitude={group.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                toggleStack(group.key)
              }}
            >
              <div
                onMouseEnter={() => setHoveredStackKey(group.key)}
                onMouseLeave={() => setHoveredStackKey(null)}
              >
                {renderItem(rep, {
                  isSelected: anySelected,
                  isHovered,
                  stackSize: group.items.length,
                })}
              </div>
            </Marker>
          )
        }

        const stackPayload =
          expandedStackData?.key === group.key
            ? expandedStackData
            : { key: group.key, items: group.items, lat: group.lat, lng: group.lng }
        return renderExpandedSpiderUi(stackPayload)
      })

  const renderPointMarkers = spiderfyEnabled ? renderPointMarkersSpiderfy : renderPointMarkersLegacy

  const legsLayer =
    spiderfyEnabled && spiderLegGeoJson && spiderLegGeoJson.features.length > 0 ? (
      <Source id={spiderLegSourceId(expandedStackKey ?? "")} type="geojson" data={spiderLegGeoJson}>
        <Layer
          id={`${spiderLegSourceId(expandedStackKey ?? "")}-layer`}
          type="line"
          paint={{
            "line-color": resolvedTheme.legColor,
            "line-opacity": Math.max(0.12, 0.9 * spiderReveal),
            "line-width": resolvedTheme.legWidthPx,
          }}
          layout={{
            "line-join": "round",
            "line-cap": "round",
          }}
        />
      </Source>
    ) : null

  return (
    <>
      <div
        ref={themeAnchorRef}
        data-spiderfy-theme-anchor
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
      />
      {legsLayer}
      {renderClusterMarkers}
      {renderPointMarkers}
      {clusterOnlyExpanded && expandedStackData
        ? renderExpandedSpiderUi(expandedStackData)
        : null}
    </>
  )
}
