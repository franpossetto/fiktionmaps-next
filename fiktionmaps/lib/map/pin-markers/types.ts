import type {
  Map2dMarkerShape,
  MapMarkerHoverScaleMode,
  MapMarkerLabelMode,
} from "@/lib/theme-settings"

export type { Map2dMarkerShape, MapMarkerLabelMode, MapMarkerHoverScaleMode }

export type PlaceMarker2dState = {
  isSelected: boolean
  isHovered: boolean
  stackSize?: number
}

export type PlaceMarker2dProps = PlaceMarker2dState & {
  imageSrc: string
  label: string
  labelMode?: MapMarkerLabelMode
  hoverScaleMode?: MapMarkerHoverScaleMode
  /** Static render for settings preview (no drop/hover motion). */
  preview?: boolean
}

export type ClusterMarker2dProps = {
  imageUrl: string
  count: number
  isHovered: boolean
  hoverScaleMode?: MapMarkerHoverScaleMode
}
