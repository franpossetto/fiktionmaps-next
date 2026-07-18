import type { ReactNode } from "react"
import type { Map2dMarkerShape, MapMarkerHoverScaleMode } from "@/lib/theme-settings"
import type { CollocatedSpiderfyTheme } from "./collocated-spiderfy-theme"

export interface LatLng {
  lat: number
  lng: number
}

export interface MapFlyToPadding {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

export interface MapFlyToOptions {
  center: LatLng
  zoom?: number
  duration?: number
  padding?: MapFlyToPadding
}

export interface MapControlHandle {
  panTo(position: LatLng): void
  setZoom(zoom: number): void
  flyTo(options: MapFlyToOptions): boolean
  getCenter?(): LatLng
  setCenter?(pos: LatLng): void
}

export interface MapContainerProps {
  id?: string
  mapKey?: string
  defaultCenter: LatLng
  defaultZoom: number
  /** When set, map view follows this center (e.g. minimap following main map). Updates when the value changes. */
  center?: LatLng
  minZoom?: number
  maxZoom?: number
  interactive?: boolean
  colorScheme?: "dark" | "light"
  /** When set, map uses this style (day, dawn, dusk, night); overrides colorScheme for the actual Mapbox style URL */
  mapStyle?: "day" | "dawn" | "dusk" | "night"
  className?: string
  children?: ReactNode
  onClick?: (position: LatLng) => void
  onCenterChange?: (center: LatLng) => void
  /** Called when the map has loaded, with a handle to control it (pan, zoom, fly). Use this when useMapControl is unreliable. */
  onMapReady?: (control: MapControlHandle) => void
  /** Called when the map zoom changes (e.g. via scroll). Rounded to integer. */
  onZoomChange?: (zoom: number) => void
  /** When false, skips the Mapbox tile loading overlay (e.g. main map uses its own bootstrap). Default true. */
  showLoadingOverlay?: boolean
  /** When false, skips custom 3D building layer setup (useful for small overview maps). Default true. */
  showBuildings3D?: boolean
  controls?: {
    fullscreen?: boolean
  }
}

export interface MarkerProps {
  position: LatLng
  /** Defaults to `bottom` (pin tip on coords). Use `center` for previews where the marker block should sit in the viewport middle. */
  anchor?: "center" | "top" | "bottom" | "left" | "right"
  onClick?: () => void
  zIndex?: number
  children?: ReactNode
  title?: string
}

export interface PolylineProps {
  path: LatLng[]
  color?: string
  opacity?: number
  weight?: number
}

export interface MapControl {
  panTo(position: LatLng): void
  setZoom(zoom: number): void
  getZoom(): number | undefined
  fitBounds(points: LatLng[], padding?: number): void
  /** Animate map to center and optional zoom. Returns false if the map was not ready. */
  flyTo(options: MapFlyToOptions): boolean
  setTilt?(tilt: number): void
  getTilt?(): number | undefined
  setHeading?(heading: number): void
  easeTo?(options: { tilt?: number; heading?: number; zoom?: number; duration?: number }): void
}

export interface ClusterItem {
  id: string
  position: LatLng
  imageUrl?: string
}

/** Optional collocated-pin spiderfy (same lat/lng). */
export interface CollocatedSpiderfyOptions {
  enabled?: boolean
  /** Merged after CSS-variable resolution (see `resolveCollocatedSpiderfyTheme`). */
  theme?: Partial<CollocatedSpiderfyTheme>
}

export interface ClusterLayerProps<T extends ClusterItem = ClusterItem> {
  items: T[]
  selectedItemId?: string | null
  onItemClick?: (item: T) => void
  renderItem: (
    item: T,
    state: { isSelected: boolean; isHovered: boolean; stackSize?: number },
  ) => ReactNode
  /** 2D pin shape for cluster chrome (square | round). Ignored when renderItem supplies full pin. */
  marker2dShape?: Map2dMarkerShape
  markerHoverScale?: MapMarkerHoverScaleMode
  maxZoom?: number
  radius?: number
  /**
   * When `true` or `{ enabled: true }`, overlapping unclustered points at the same coordinates
   * collapse to one marker and fan out on click. Default: off when omitted.
   */
  collocatedSpiderfy?: boolean | CollocatedSpiderfyOptions
}

export interface GeocodingPrediction {
  id: string
  description: string
  types?: string[]
}

export interface GeocodingResult {
  lat: number
  lng: number
  formattedAddress?: string
  types?: string[]
  addressComponents?: Array<{ types: string[] }>
}

export interface GeocodingAdapter {
  ready: boolean
  geocode(address: string): Promise<GeocodingResult | null>
  autocomplete(input: string): Promise<GeocodingPrediction[]>
  getPlaceDetails(id: string): Promise<GeocodingResult | null>
}
