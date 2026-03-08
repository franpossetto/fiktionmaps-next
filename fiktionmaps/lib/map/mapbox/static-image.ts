/**
 * Build Mapbox Static Images API URLs for theme preview thumbnails.
 * Uses default Mapbox styles (light-v11, dark-v11) for consistent previews.
 * @see https://docs.mapbox.com/api/maps/static-images/
 */

const MAPBOX_STATIC_BASE = "https://api.mapbox.com/styles/v1"

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
