import type { MapMarkerHoverScaleMode } from "@/lib/theme-settings"

/** Framer-motion scale on the whole 2D pin root / 3D pin (8% above 1:1). */
export const PIN_HOVER_MOTION_SCALE_NORMAL = 1.08

const PIN_2D_IDLE_INNER_PX = 56
const PIN_2D_HOVER_INNER_NORMAL_PX = 60

/** Strong mode: 2× the growth amount of the previous strong preset (6× normal delta). */
const STRONG_HOVER_GROWTH_MULTIPLIER = 6

export function getPinHoverMotionScale(mode?: MapMarkerHoverScaleMode): number {
  const delta = PIN_HOVER_MOTION_SCALE_NORMAL - 1
  return mode === "strong"
    ? 1 + delta * STRONG_HOVER_GROWTH_MULTIPLIER
    : PIN_HOVER_MOTION_SCALE_NORMAL
}

/** CSS scale on cluster chrome while hovered (5% normal → 30% strong). */
export function getPinActiveTailwindScaleClass(mode?: MapMarkerHoverScaleMode): string {
  return mode === "strong" ? "scale-[1.30]" : "scale-105"
}

/** Inner bubble diameter (px) on hover — strong adds 24px vs normal +4px. */
export function getPin2dHoverInnerPx(mode?: MapMarkerHoverScaleMode): number {
  const delta = PIN_2D_HOVER_INNER_NORMAL_PX - PIN_2D_IDLE_INNER_PX
  return (
    PIN_2D_IDLE_INNER_PX +
    delta * (mode === "strong" ? STRONG_HOVER_GROWTH_MULTIPLIER : 1)
  )
}
