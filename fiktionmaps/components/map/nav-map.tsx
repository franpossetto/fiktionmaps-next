"use client"

import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import dynamic from "next/dynamic"
import type { Place } from "@/src/places/domain/place.entity"
import type { City } from "@/src/cities/domain/city.entity"
import { Expand, Map, Minimize2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useIsMobile } from "@/hooks/use-mobile"
import { useNavCollapsedStorage } from "@/lib/local-storage-service-hooks"
import { MAP_MINIMAP_SLOT_ID } from "./map-slots"

const SIZE_SMALL = { width: 200, height: 140 }
const SIZE_EXPANDED = { width: 360, height: 280 }

/** Second Mapbox instance only when the minimap is visible. */
const NavMapCanvas = dynamic(
  () => import("./nav-map-canvas").then((m) => ({ default: m.NavMapCanvas })),
  { ssr: false },
)

interface NavMapProps {
  city: City
  viewportCenter: { lat: number; lng: number }
  places: Place[]
  onMinimapClick: (position: { lat: number; lng: number }) => void
}

export function NavMap({ city, viewportCenter, places, onMinimapClick }: NavMapProps) {
  const t = useTranslations("Map")
  const isMobile = useIsMobile()
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [navCollapsed, setNavCollapsed] = useNavCollapsedStorage()
  const isVisible = !navCollapsed

  useEffect(() => {
    const el = document.getElementById(MAP_MINIMAP_SLOT_ID)
    if (el) setContainer(el)
  }, [])

  const handleMinimapClick = useCallback(
    (position: { lat: number; lng: number }) => {
      onMinimapClick(position)
    },
    [onMinimapClick],
  )

  if (isMobile) return null

  if (!container) return null

  if (!isVisible) {
    return createPortal(
      <button
        type="button"
        onClick={() => setNavCollapsed(false)}
        className="flex items-center gap-2 rounded-lg border border-border bg-chrome/95 px-3 py-2 text-xs font-medium text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors hover:bg-chrome"
        aria-label={t("showNavMap")}
      >
        <Map className="h-4 w-4" />
        {t("showNavMap")}
      </button>,
      container,
    )
  }

  const size = isExpanded ? SIZE_EXPANDED : SIZE_SMALL

  return createPortal(
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setNavCollapsed(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-chrome/95 text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors hover:bg-chrome"
          aria-label={t("hideNavMap")}
        >
          <X className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsExpanded((e) => !e)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-chrome/95 text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-colors hover:bg-chrome"
          aria-label={isExpanded ? t("collapseMap") : t("expandMap")}
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Expand className="h-4 w-4" />
          )}
        </button>
      </div>
      <div
        className="overflow-hidden rounded-lg border border-border bg-background ring-1 ring-black/10"
        style={{
          boxShadow:
            "0 4px 6px -1px rgba(0,0,0,0.2), 0 10px 24px -4px rgba(0,0,0,0.35), 0 20px 48px -8px rgba(0,0,0,0.4)",
        }}
      >
        <NavMapCanvas
          city={city}
          viewportCenter={viewportCenter}
          places={places}
          width={size.width}
          height={size.height}
          onMinimapClick={handleMinimapClick}
        />
      </div>
    </div>,
    container,
  )
}
