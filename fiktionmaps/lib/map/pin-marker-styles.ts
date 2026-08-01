import type { MapMarkerHoverScaleMode } from "@/lib/theme-settings"
import { getPin2dHoverInnerPx } from "@/lib/map/pin-marker-hover-scale"

/** Shared map pin chrome (2D places, clusters, 3D). */
export const pinStrokeBorderClass = "border-2 border-black dark:border-white"

/**
 * Safari often ignores overflow+radius under Mapbox transforms / ancestor filters
 * until a hover repaint; clip-path forces a circular image mask.
 */
export const pinRoundImageClipClass =
  "overflow-hidden rounded-full [clip-path:circle(50%)]"

export const pinConicRingClass =
  "bg-[conic-gradient(from_0deg,#000000,transparent,#000000)] dark:bg-[conic-gradient(from_0deg,#ffffff,transparent,#ffffff)]"

export const pin2dPointerColorClass = "border-t-black dark:border-t-white"

export const pin2dPointerSizeClass =
  "border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent"

const PIN_2D_RING_PADDING = 8
const PIN_2D_PLACE_DEFAULT_INNER = 56
const PIN_2D_CLUSTER_SCALE = 1.25

/** Inner image diameter (px); outer ring frame is +8px. */
export function getPin2dBubbleSizes(
  isSelected: boolean,
  isHovered: boolean,
  hoverScaleMode?: MapMarkerHoverScaleMode,
) {
  const inner = isSelected
    ? 64
    : isHovered
      ? getPin2dHoverInnerPx(hoverScaleMode)
      : PIN_2D_PLACE_DEFAULT_INNER
  return { inner, outer: inner + PIN_2D_RING_PADDING }
}

/** Cluster pins are 25% larger than single-place pins at the same interaction state. */
export function getPin2dClusterBubbleSizes(
  isHovered: boolean,
  hoverScaleMode?: MapMarkerHoverScaleMode,
) {
  const { inner: placeInner } = getPin2dBubbleSizes(false, isHovered, hoverScaleMode)
  const inner = Math.round(placeInner * PIN_2D_CLUSTER_SCALE)
  return { inner, outer: inner + PIN_2D_RING_PADDING }
}

/** Center of count badge on the circle rim (top-right), relative to outer frame. */
export function getPin2dClusterBadgePosition(
  outer: number,
  inner: number,
  badgeSize: number,
) {
  const center = outer / 2
  const rim = inner / 2
  const offset = rim * Math.SQRT1_2
  return {
    left: center + offset - badgeSize / 2,
    top: center - offset - badgeSize / 2,
  }
}
