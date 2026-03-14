import type { ReactNode } from "react"

export interface LatLng {
  lat: number
  lng: number
}

export interface MapControlHandle {
  panTo(position: LatLng): void
  setZoom(zoom: number): void
  flyTo(options: { center: LatLng; zoom?: number; duration?: number }): void
  getCenter?(): LatLng
  setCenter?(pos: LatLng): void
}

export interface MapContainerProps {
  id?: string
  mapKey?: string
  defaultCenter: LatLng
  defaultZoom: number
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
  controls?: {
    zoom?: boolean
    fullscreen?: boolean
  }
}

export interface MarkerProps {
  position: LatLng
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
  /** Animate map to center and optional zoom. */
  flyTo(options: { center: LatLng; zoom?: number; duration?: number }): void
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

export interface ClusterLayerProps<T extends ClusterItem = ClusterItem> {
  items: T[]
  selectedItemId?: string | null
  onItemClick?: (item: T) => void
  renderItem: (
    item: T,
    state: { isSelected: boolean; isHovered: boolean },
  ) => ReactNode
  maxZoom?: number
  radius?: number
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
