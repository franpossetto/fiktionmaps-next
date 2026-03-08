"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Map as ReactMapGL,
  NavigationControl,
  FullscreenControl,
} from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import type { MapContainerProps } from "../types"
import { MapLoadedProvider } from "../map-loaded-context"
import { MAPBOX_ACCESS_TOKEN, MAPBOX_DAY_STYLE, MAPBOX_DAWN_STYLE, MAPBOX_DUSK_STYLE, MAPBOX_NIGHT_STYLE } from "./styles"
import { MapboxBuildings3D } from "./buildings"

export function MapboxContainer({
  id,
  defaultCenter,
  defaultZoom,
  minZoom,
  maxZoom,
  interactive = true,
  colorScheme = "dark",
  mapStyle,
  className,
  children,
  onClick,
  onCenterChange,
  controls,
}: MapContainerProps) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const onLoad = useCallback(() => setMapLoaded(true), [])

  /* 4 map styles: day, dawn, dusk, night — 1:1 with env vars (DAWN_URL→dawn, DUSK_URL→dusk) */
  const style = mapStyle
    ? mapStyle === "day"
      ? MAPBOX_DAY_STYLE
      : mapStyle === "dawn"
        ? MAPBOX_DAWN_STYLE
        : mapStyle === "dusk"
          ? MAPBOX_DUSK_STYLE
          : MAPBOX_NIGHT_STYLE
    : colorScheme === "light"
      ? MAPBOX_DAY_STYLE
      : MAPBOX_NIGHT_STYLE
  const showZoom = controls?.zoom ?? interactive
  const showFullscreen = controls?.fullscreen ?? false

  return (
    <div className={`${className} relative`} style={{ width: "100%", height: "100%" }}>
      <ReactMapGL
        id={id}
        initialViewState={{
          longitude: defaultCenter.lng,
          latitude: defaultCenter.lat,
          zoom: defaultZoom,
        }}
        minZoom={minZoom}
        maxZoom={maxZoom}
        mapStyle={style}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        interactive={interactive}
        scrollZoom={interactive}
        dragPan={interactive}
        dragRotate={interactive}
        doubleClickZoom={interactive}
        touchZoomRotate={interactive}
        keyboard={interactive}
        onLoad={onLoad}
        onClick={
          onClick
            ? (e) => onClick({ lat: e.lngLat.lat, lng: e.lngLat.lng })
            : undefined
        }
        onMoveEnd={
          onCenterChange
            ? (e) =>
                onCenterChange({
                  lat: e.viewState.latitude,
                  lng: e.viewState.longitude,
                })
            : undefined
        }
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        logoPosition="bottom-right"
      >
        <MapLoadedProvider value={mapLoaded}>
          {showZoom && <NavigationControl showCompass={false} position="bottom-right" />}
          {showFullscreen && <FullscreenControl position="top-right" />}
          {children}
          {interactive && <MapboxBuildings3D />}
        </MapLoadedProvider>
      </ReactMapGL>
      <AnimatePresence>
        {!mapLoaded && (
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-[2px]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="h-9 w-9 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
              <span className="text-sm font-medium text-muted-foreground">Loading map…</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
