const MIN_ZOOM = 0
const MAX_ZOOM = 4

/** Street View panorama zoom (0–4) to horizontal field of view in degrees. */
export function streetViewZoomToFov(zoom: number): number {
  const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
  return 180 / 2 ** clamped
}

/** Horizontal field of view in degrees to Street View panorama zoom (0–4). */
export function streetViewFovToZoom(fov: number): number {
  const clampedFov = Math.max(10, Math.min(120, fov))
  const zoom = Math.log2(180 / clampedFov)
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
}

export const STREET_VIEW_FOV_MIN = 10
export const STREET_VIEW_FOV_MAX = 120
export const STREET_VIEW_FOV_DEFAULT = 90
