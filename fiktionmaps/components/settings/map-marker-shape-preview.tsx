"use client"

import { useTranslations } from "next-intl"
import type {
  Map2dMarkerShape,
  MapMarkerHoverScaleMode,
  MapMarkerLabelMode,
  ThemeBase,
} from "@/lib/theme-settings"
import { PlaceMarker2dV1 } from "@/lib/map/pin-markers/v1/place-marker-2d"
import { PlaceMarker2dV2 } from "@/lib/map/pin-markers/v2/place-marker-2d"
import { cn } from "@/lib/utils"

/** Place photo used in settings (Central Perk — same pool as map location assets). */
export const MAP_MARKER_PREVIEW_IMAGE_SRC = "/locations/central-perk.jpg"

type MapMarkerShapePreviewProps = {
  shape: Map2dMarkerShape
  labelMode?: MapMarkerLabelMode
  hoverScaleMode?: MapMarkerHoverScaleMode
  simulateHover?: boolean
  themeBase: ThemeBase
  variant?: "inline" | "standalone"
  className?: string
}

/** Live 2D map pin preview for settings. */
export function MapMarkerShapePreview({
  shape,
  themeBase,
  labelMode = "hover",
  hoverScaleMode = "normal",
  simulateHover = false,
  variant = "inline",
  className,
}: MapMarkerShapePreviewProps) {
  const t = useTranslations("Settings.markers")
  const isDark = themeBase === "dark"
  const pinProps = {
    imageSrc: MAP_MARKER_PREVIEW_IMAGE_SRC,
    label: t("previewPlaceName"),
    labelMode,
    hoverScaleMode,
    isSelected: false,
    isHovered: simulateHover,
    preview: true,
  }

  const isStandalone = variant === "standalone"

  return (
    <div
      className={cn(
        "flex w-full justify-center overflow-visible",
        isStandalone
          ? "items-center"
          : "items-end rounded-xl border border-border px-2 pb-1 pt-4",
        !isStandalone && (labelMode === "always" || simulateHover ? "h-[128px]" : "h-[108px]"),
        !isStandalone && (isDark ? "dark bg-zinc-900/95" : "bg-slate-100/95"),
        className,
      )}
    >
      <div className={cn(isStandalone && "origin-center scale-[1.35]")}>
        {shape === "square" ? (
          <PlaceMarker2dV1 {...pinProps} />
        ) : (
          <PlaceMarker2dV2 {...pinProps} />
        )}
      </div>
    </div>
  )
}
