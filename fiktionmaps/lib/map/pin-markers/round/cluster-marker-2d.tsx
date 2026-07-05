"use client"

import {
  getPin2dClusterBadgePosition,
  getPin2dClusterBubbleSizes,
  pin2dPointerColorClass,
  pin2dPointerSizeClass,
  pinConicRingClass,
  pinStrokeBorderClass,
} from "@/lib/map/pin-marker-styles"
import { Pin2dMarkerColumn } from "../pin-2d-marker-column"
import type { ClusterMarker2dProps } from "../types"

/** Round cluster pin with conic ring (settings: marker2dShape = round). */
export function ClusterMarker2dRound({
  imageUrl,
  count,
  isHovered,
  hoverScaleMode,
}: ClusterMarker2dProps) {
  const dotSize = count >= 10 ? 22 : 20
  const dotFontSize = count >= 10 ? 11 : 12
  const { inner: bubbleInner, outer: bubbleOuter } = getPin2dClusterBubbleSizes(
    isHovered,
    hoverScaleMode,
  )
  const badgePos = getPin2dClusterBadgePosition(bubbleOuter, bubbleInner, dotSize)

  return (
    <Pin2dMarkerColumn
      chrome={
        <>
          <div
            className={`h-0 w-0 shrink-0 transition-colors ${pin2dPointerSizeClass} ${pin2dPointerColorClass}`}
          />
          <div
            className="relative flex shrink-0 items-center justify-center transition-all duration-200"
            style={{
              width: bubbleOuter,
              height: bubbleOuter,
            }}
          >
            <div
              className={`absolute inset-0 rounded-full ${pinConicRingClass} ${
                isHovered ? "pin3d-spin opacity-100" : "opacity-60"
              }`}
            />
            <div
              className={`relative overflow-hidden rounded-full ${pinStrokeBorderClass}`}
              style={{ width: bubbleInner, height: bubbleInner }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
                }}
              />
            </div>
            <div
              className="absolute box-border grid place-items-center rounded-full border-2 border-background bg-[#e8365d] text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
              style={{
                left: badgePos.left,
                top: badgePos.top,
                width: dotSize,
                height: dotSize,
                zIndex: 10,
              }}
            >
              <span
                className="inline-flex h-[1em] items-center justify-center font-bold leading-none tabular-nums"
                style={{ fontSize: dotFontSize }}
              >
                {count}
              </span>
            </div>
          </div>
        </>
      }
    />
  )
}
