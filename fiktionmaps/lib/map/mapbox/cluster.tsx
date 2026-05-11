"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Layer, Marker, Source, useMap } from "react-map-gl/mapbox"
import Supercluster from "supercluster"
import type { ClusterItem, ClusterLayerProps, LatLng } from "../types"
import { resolveCollocatedSpiderfyTheme } from "../collocated-spiderfy-theme"
import type { CollocatedSpiderfyTheme } from "../collocated-spiderfy-theme"
import {
  computeSpiderLngLats,
  getCollocatedClusterStack,
  groupCollocatedPointFeatures,
  useCollocatedSpiderfy,
  type CollocatedPointGroup,
} from "../use-collocated-spiderfy"
import type { Map as MapboxMap } from "mapbox-gl"

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

export function MapboxClusterLayer<T extends ClusterItem>({
  items,
  selectedItemId,
  onItemClick,
  renderItem,
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
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = leafLngLats.map((leaf) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [center.lng, center.lat],
          [leaf.lng, leaf.lat],
        ],
      },
      properties: {},
    }))
    return {
      type: "FeatureCollection" as const,
      features,
    }
  }, [spiderfyEnabled, expandedStackData, mapRef, resolvedTheme, styleLoaded, spiderLayoutTick])

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
        <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-border bg-background/95 text-xs font-bold shadow-md">
          ×
        </div>
      </Marker>
    )

    const leaves = visibleItems.map((item, index) => {
      const pos = leafLngLats[index] ?? center
      const isSelected = selectedItemId === item.id
      const isHovered = hoveredId === item.id
      return (
        <Marker
          key={`stack-leaf-${data.key}-${item.id}`}
          longitude={pos.lng}
          latitude={pos.lat}
          anchor="bottom"
          style={{ zIndex: 5 }}
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
    })

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
    const dotSize = count >= 10 ? 20 : 18
    const dotFontSize = count >= 10 ? 10 : 11

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
        <div className="flex cursor-pointer flex-col items-center">
          <div className="relative overflow-visible">
            <div
              className="h-14 w-14 overflow-hidden rounded-lg border-2 border-border transition-all duration-200"
              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <div
              className="absolute flex items-center justify-center rounded-full bg-[#e8365d] font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)] border-2 border-[#0b0f14]"
              style={{
                top: -Math.round(dotSize * 0.45),
                right: -Math.round(dotSize * 0.45),
                width: dotSize,
                height: dotSize,
                fontSize: dotFontSize,
                lineHeight: 1,
                zIndex: 10,
              }}
            >
              {count}
            </div>
          </div>
          <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-border" />
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
            "line-opacity": 0.9,
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
