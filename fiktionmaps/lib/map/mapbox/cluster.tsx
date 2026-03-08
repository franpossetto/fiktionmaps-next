"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Marker, useMap } from "react-map-gl/mapbox"
import Supercluster from "supercluster"
import type { ClusterItem, ClusterLayerProps, LatLng } from "../types"

type PointFeature<T> = GeoJSON.Feature<GeoJSON.Point, T>
type ClusterFeature = Supercluster.ClusterFeature<Supercluster.AnyProps>

export function MapboxClusterLayer<T extends ClusterItem>({
  items,
  selectedItemId,
  onItemClick,
  renderItem,
  maxZoom = 20,
  radius = 70,
}: ClusterLayerProps<T>) {
  const maps = useMap()
  const mapRef = maps.current
  const [clusters, setClusters] = useState<
    Array<ClusterFeature | PointFeature<T>>
  >([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)

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

  const updateClusters = useCallback(() => {
    if (!mapRef) return
    try {
      const map = mapRef.getMap()
      const bounds = map.getBounds()
      if (!bounds) return
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]
      const zoom = Math.floor(map.getZoom())
      setClusters(superclusterRef.current.getClusters(bbox, zoom))
    } catch {
      // Map not ready yet — skip this update
    }
  }, [mapRef])

  useEffect(() => {
    updateClusters()
  }, [updateClusters, supercluster])

  useEffect(() => {
    if (!mapRef) return
    try {
      const map = mapRef.getMap()
      const onMove = () => updateClusters()
      map.on("moveend", onMove)
      map.on("load", onMove)
      if (!map.isStyleLoaded()) {
        map.once("styledata", onMove)
      }
      return () => {
        map.off("moveend", onMove)
        map.off("load", onMove)
        map.off("styledata", onMove)
      }
    } catch {
      // Map not initialized yet
    }
  }, [mapRef, updateClusters])

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates
        const position: LatLng = { lat, lng }

        if ("cluster" in feature.properties && feature.properties.cluster) {
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

          return (
            <Marker
              key={`cluster-${clusterId}`}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                if (!mapRef) return
                try {
                  const zoom = supercluster.getClusterExpansionZoom(clusterId)
                  mapRef.getMap().flyTo({ center: [lng, lat], zoom })
                } catch {
                  // Stale cluster id — just zoom in on the cluster center
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
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
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
        }

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
            <div
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {renderItem(item, { isSelected, isHovered })}
            </div>
          </Marker>
        )
      })}
    </>
  )
}
