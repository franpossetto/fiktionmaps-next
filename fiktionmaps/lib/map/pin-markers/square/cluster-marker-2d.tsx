"use client"

import { getPin2dHoverInnerPx } from "@/lib/map/pin-marker-hover-scale"
import {
  pin2dPointerColorClass,
  pin2dPointerSizeClass,
  pinStrokeBorderClass,
} from "@/lib/map/pin-marker-styles"
import { cn } from "@/lib/utils"
import { Pin2dMarkerColumn } from "../pin-2d-marker-column"
import type { ClusterMarker2dProps } from "../types"

const CLUSTER_IDLE_PX = 56

/** Square cluster pin (settings: marker2dShape = square). */
export function ClusterMarker2dSquare({
  imageUrl,
  count,
  isHovered,
  hoverScaleMode,
}: ClusterMarker2dProps) {
  const dotSize = count >= 10 ? 20 : 18
  const dotFontSize = count >= 10 ? 10 : 11
  const sidePx = isHovered ? getPin2dHoverInnerPx(hoverScaleMode) : CLUSTER_IDLE_PX

  return (
    <Pin2dMarkerColumn
      chrome={
        <>
          <div
            className={cn(
              "h-0 w-0 shrink-0 transition-colors",
              pin2dPointerSizeClass,
              pin2dPointerColorClass,
            )}
          />
          <div className="relative shrink-0 overflow-visible">
            <div
              className={cn(
                "overflow-hidden rounded-lg transition-all duration-200",
                pinStrokeBorderClass,
              )}
              style={{ width: sidePx, height: sidePx }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <div
              className="absolute flex items-center justify-center rounded-full border-2 border-[#0b0f14] bg-[#e8365d] font-bold text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
              style={{
                top: -Math.round(dotSize * 0.45),
                right: -Math.round(dotSize * 0.45),
                width: dotSize,
                height: dotSize,
                fontSize: dotFontSize,
                lineHeight: 1,
                zIndex: 10,
              }}
            >
              {count}
            </div>
          </div>
        </>
      }
    />
  )
}
