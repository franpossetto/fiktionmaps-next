"use client"

import type { ReactNode } from "react"
import dynamic from "next/dynamic"
import type { LatLng } from "@/lib/map/types"
import {
  WISHLIST_MAP_FRAME_CLASS,
  type WishlistMapPin,
  type WishlistStayPin,
} from "./wishlist-city-map"

const WishlistCityMap = dynamic(
  () => import("./wishlist-city-map").then((m) => ({ default: m.WishlistCityMap })),
  {
    ssr: false,
    loading: () => <div className={`${WISHLIST_MAP_FRAME_CLASS} animate-pulse bg-muted/40`} aria-hidden />,
  },
)

export function WishlistCityMapLazy({
  mapInstanceId,
  pins,
  selectedId,
  stay,
  overlay,
  pickingStay,
  onMapClick,
}: {
  mapInstanceId: string
  pins: WishlistMapPin[]
  selectedId: string | null
  stay?: WishlistStayPin | null
  overlay?: ReactNode
  pickingStay?: boolean
  onMapClick?: (position: LatLng) => void
}) {
  return (
    <WishlistCityMap
      mapInstanceId={mapInstanceId}
      pins={pins}
      selectedId={selectedId}
      stay={stay}
      overlay={overlay}
      pickingStay={pickingStay}
      onMapClick={onMapClick}
    />
  )
}
