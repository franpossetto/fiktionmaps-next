"use client"

import type { Map2dMarkerShape } from "@/lib/theme-settings"
import type { PlaceMarker2dProps } from "./types"
import { PlaceMarker2dV1 } from "./v1/place-marker-2d"
import { ClusterMarker2dV1 } from "./v1/cluster-marker-2d"
import { PlaceMarker2dV2 } from "./v2/place-marker-2d"
import { ClusterMarker2dV2 } from "./v2/cluster-marker-2d"
import { PlaceMarker3d } from "./place-marker-3d"

export type { Map2dMarkerShape, PlaceMarker2dProps, PlaceMarker2dState, ClusterMarker2dProps } from "./types"

export function PlaceMarker2d({
  shape,
  ...props
}: PlaceMarker2dProps & { shape: Map2dMarkerShape }) {
  return shape === "square" ? <PlaceMarker2dV1 {...props} /> : <PlaceMarker2dV2 {...props} />
}

export function ClusterMarker2d({
  shape,
  ...props
}: import("./types").ClusterMarker2dProps & { shape: Map2dMarkerShape }) {
  return shape === "square" ? <ClusterMarker2dV1 {...props} /> : <ClusterMarker2dV2 {...props} />
}

export { PlaceMarker3d }
