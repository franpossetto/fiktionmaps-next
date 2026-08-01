"use client"

import { useEffect, useMemo, useState } from "react"
import type { Place } from "@/src/places/domain/place.entity"
import { MapContainer, MapMarker, useMapControl } from "@/lib/map"
import type { LatLng } from "@/lib/map"
import { PlaceMarker2d } from "@/lib/map/pin-markers"
import { useMapMarker2dShape } from "@/lib/theme-settings-context"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"

export function placeLatLng(place: Place): LatLng | null {
  const lat = place.location.lat
  const lng = place.location.lng
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}

export function placesRoutePoints(places: Place[]): LatLng[] {
  return places.map(placeLatLng).filter((p): p is LatLng => p != null)
}

/** Stable set key — order changes must not re-fit / remount the map. */
function placeIdsSetKey(places: Place[]): string {
  return [...places.map((p) => p.id)].sort().join(",")
}

function FitRouteBounds({
  mapId,
  routePoints,
  placesKey,
  fitPadding,
  fitMaxZoom,
  onFittedZoom,
}: {
  mapId: string
  routePoints: LatLng[]
  placesKey: string
  fitPadding: number
  fitMaxZoom: number
  onFittedZoom?: (zoom: number) => void
}) {
  const map = useMapControl(mapId)

  useEffect(() => {
    if (!map || routePoints.length === 0) return

    const fit = () => {
      if (routePoints.length === 1) {
        map.flyTo({
          center: routePoints[0]!,
          zoom: Math.min(15, fitMaxZoom),
          duration: 0,
        })
      } else {
        map.fitBounds(routePoints, fitPadding, fitMaxZoom)
      }
      const zoom = map.getZoom()
      if (zoom != null) onFittedZoom?.(zoom)
    }

    fit()
    // Container size can settle one frame after mapLoaded; re-fit once layout is stable.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(fit)
    })
    return () => cancelAnimationFrame(raf)
    // Only when the set of places changes, not when they are reordered.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: placesKey gates refits
  }, [map, placesKey, fitPadding, fitMaxZoom])

  return null
}

function FocusPlace({
  mapId,
  place,
  zoom,
  maxZoom,
}: {
  mapId: string
  place: Place | null
  zoom: number
  maxZoom?: number
}) {
  const map = useMapControl(mapId)

  useEffect(() => {
    if (!map || !place) return
    const center = placeLatLng(place)
    if (!center) return
    const targetZoom = maxZoom != null ? Math.min(zoom, maxZoom) : zoom
    map.flyTo({ center, zoom: targetZoom, duration: 1400 })
  }, [map, place, zoom, maxZoom])

  return null
}

type SceneContributeRouteMapProps = {
  mapId: string
  fictionId: string
  selectedPlaces: Place[]
  className?: string
  interactive?: boolean
  /** Place to calmly fly to (e.g. list selection on the watch page). */
  focusPlaceId?: string | null
  focusZoom?: number
  fitPadding?: number
  fitMaxZoom?: number
  /**
   * After fitting the route, allow the user to zoom in by this many Mapbox levels
   * (1 level ≈ 2× scale). Locks minZoom to the fitted overview.
   */
  allowZoomInLevels?: number
  /** When set, pins are clickable and call this with the place id. */
  onPlaceSelect?: (placeId: string) => void
}

export function SceneContributeRouteMap({
  mapId,
  fictionId,
  selectedPlaces,
  className,
  interactive = true,
  focusPlaceId = null,
  focusZoom = 16,
  fitPadding = 48,
  fitMaxZoom = 17,
  allowZoomInLevels,
  onPlaceSelect,
}: SceneContributeRouteMapProps) {
  const marker2dShape = useMapMarker2dShape()
  const placesKey = useMemo(() => placeIdsSetKey(selectedPlaces), [selectedPlaces])
  const routePoints = useMemo(() => placesRoutePoints(selectedPlaces), [selectedPlaces])
  const defaultCenter = routePoints[0] ?? { lat: 43.5081, lng: 16.4402 }
  const focusPlace = focusPlaceId
    ? selectedPlaces.find((p) => p.id === focusPlaceId) ?? null
    : null
  const [zoomLimits, setZoomLimits] = useState<{ min: number; max: number } | null>(null)

  return (
    <MapContainer
      id={mapId}
      mapKey={`${mapId}-${fictionId}`}
      defaultCenter={defaultCenter}
      defaultZoom={routePoints.length > 1 ? 14 : 15}
      interactive={interactive}
      minZoom={zoomLimits?.min}
      maxZoom={zoomLimits?.max}
      showLoadingOverlay={false}
      showBuildings3D={false}
      controls={{ fullscreen: false }}
      className={className ?? "h-full w-full"}
    >
      <FitRouteBounds
        mapId={mapId}
        routePoints={routePoints}
        placesKey={placesKey}
        fitPadding={fitPadding}
        fitMaxZoom={fitMaxZoom}
        onFittedZoom={
          allowZoomInLevels != null
            ? (zoom) =>
                setZoomLimits({
                  min: zoom,
                  max: zoom + allowZoomInLevels,
                })
            : undefined
        }
      />
      <FocusPlace
        mapId={mapId}
        place={focusPlace}
        zoom={focusZoom}
        maxZoom={zoomLimits?.max}
      />
      {selectedPlaces.map((place) => {
        const position = placeLatLng(place)
        if (!position) return null
        const isSelected = place.id === focusPlaceId
        return (
          <MapMarker
            key={place.id}
            position={position}
            anchor="bottom"
            zIndex={isSelected ? 20 : 10}
            onClick={onPlaceSelect ? () => onPlaceSelect(place.id) : undefined}
          >
            <PlaceMarker2d
              shape={marker2dShape}
              imageSrc={place.image?.trim() || DEFAULT_FICTION_COVER}
              imageFocus={place.imageFocus ?? null}
              label={place.name}
              labelMode="hover"
              isSelected={isSelected}
              isHovered={false}
              preview={!onPlaceSelect}
            />
          </MapMarker>
        )
      })}
    </MapContainer>
  )
}
