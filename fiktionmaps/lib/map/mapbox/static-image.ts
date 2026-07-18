/**
 * Build Mapbox Static Images API URLs for theme preview thumbnails and city covers.
 * @see https://docs.mapbox.com/api/maps/static-images/
 */

const MAPBOX_STATIC_BASE = "https://api.mapbox.com/styles/v1"

/**
 * Returns a satellite-streets static image URL centered on the given city coordinates.
 * Safe to use server-side (reads env var) or client-side.
 */
/**
 * Returns a Mapbox satellite-streets static image URL for a city.
 * Max width/height is 1280px (no @2x — to avoid exceeding the API limit).
 */
export function getCityStaticImageUrl(
  lat: number,
  lng: number,
  zoom: number,
  width = 800,
  height = 400,
): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""
  const w = Math.min(width, 1280)
  const h = Math.min(height, 1280)
  return `${MAPBOX_STATIC_BASE}/mapbox/satellite-streets-v12/static/${lng},${lat},${zoom}/${w}x${h}?access_token=${token}`
}

/** Default center and zoom for preview thumbnails (San Francisco) */
const PREVIEW_LON = -122.42
const PREVIEW_LAT = 37.78
const PREVIEW_ZOOM = 12
const PREVIEW_WIDTH = 320
const PREVIEW_HEIGHT = 180

/**
 * Returns a static map image URL for the given style.
 * Uses NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN (call from client so token is available).
 */
export function getMapboxStaticImageUrl(
  styleSlug: "light" | "dark" | "streets" = "light",
  width: number = PREVIEW_WIDTH,
  height: number = PREVIEW_HEIGHT
): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ""
  const style =
    styleSlug === "dark"
      ? "mapbox/dark-v11"
      : styleSlug === "streets"
        ? "mapbox/streets-v12"
        : "mapbox/light-v11"
  const position = `${PREVIEW_LON},${PREVIEW_LAT},${PREVIEW_ZOOM}`
  return `${MAPBOX_STATIC_BASE}/${style}/static/auto/${position}/${width}x${height}@2x?access_token=${token}`
}
