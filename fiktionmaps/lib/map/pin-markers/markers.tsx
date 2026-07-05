"use client"

import type { Map2dMarkerShape } from "@/lib/theme-settings"
import type { PlaceMarker2dProps } from "./types"
import { PlaceMarker2dSquare } from "./square/place-marker-2d"
import { ClusterMarker2dSquare } from "./square/cluster-marker-2d"
import { PlaceMarker2dRound } from "./round/place-marker-2d"
import { ClusterMarker2dRound } from "./round/cluster-marker-2d"
import { PlaceMarker3d } from "./place-marker-3d"

export type { Map2dMarkerShape, PlaceMarker2dProps, PlaceMarker2dState, ClusterMarker2dProps } from "./types"

export function PlaceMarker2d({
  shape,
  ...props
}: PlaceMarker2dProps & { shape: Map2dMarkerShape }) {
  return shape === "square" ? <PlaceMarker2dSquare {...props} /> : <PlaceMarker2dRound {...props} />
}

export function ClusterMarker2d({
  shape,
  ...props
}: import("./types").ClusterMarker2dProps & { shape: Map2dMarkerShape }) {
  return shape === "square" ? <ClusterMarker2dSquare {...props} /> : <ClusterMarker2dRound {...props} />
}

export { PlaceMarker3d }
