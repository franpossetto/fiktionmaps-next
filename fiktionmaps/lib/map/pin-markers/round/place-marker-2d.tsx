"use client"

import Image from "next/image"
import {
  getPin2dBubbleSizes,
  pin2dPointerColorClass,
  pin2dPointerSizeClass,
  pinConicRingClass,
  pinRoundImageClipClass,
  pinStrokeBorderClass,
} from "@/lib/map/pin-marker-styles"
import { PinMarkerLabel } from "../pin-marker-label"
import { Pin2dMarkerColumn } from "../pin-2d-marker-column"
import { shouldShowPinLabel } from "../should-show-pin-label"
import type { PlaceMarker2dProps } from "../types"
import { PinMarkerRoot } from "../motion"

/** Round 2D pin with conic ring (settings: marker2dShape = round). */
export function PlaceMarker2dRound({
  imageSrc,
  imageFocus,
  label,
  labelMode,
  hoverScaleMode,
  isSelected,
  isHovered,
  stackSize,
  preview,
}: PlaceMarker2dProps) {
  const showStackBadge = stackSize != null && stackSize > 1
  const active = isSelected || isHovered
  const showLabel = shouldShowPinLabel(labelMode, { preview, isSelected, isHovered })
  const labelAnimates = labelMode !== "always"
  const { inner, outer } = getPin2dBubbleSizes(isSelected, isHovered, hoverScaleMode)

  return (
    <PinMarkerRoot preview={preview}>
      <Pin2dMarkerColumn
        preview={preview}
        label={
          showLabel ? (
            <PinMarkerLabel label={label} show animate={labelAnimates} />
          ) : undefined
        }
        chrome={
          <>
            <div
              className={`h-0 w-0 shrink-0 transition-colors ${pin2dPointerSizeClass} ${pin2dPointerColorClass}`}
            />
            <div
              className="relative flex shrink-0 items-center justify-center transition-all duration-200"
              style={{
                width: outer,
                height: outer,
              }}
            >
              <div
                className={`absolute inset-0 rounded-full ${pinConicRingClass} ${active ? "pin3d-spin opacity-100" : "opacity-60"}`}
              />
              <div
                className={`relative ${pinRoundImageClipClass} ${pinStrokeBorderClass} ${
                  isSelected ? "ring-2 ring-black/20 dark:ring-white/30" : ""
                }`}
                style={{ width: inner, height: inner }}
              >
                <Image
                  src={imageSrc}
                  alt={label}
                  fill
                  className="rounded-full object-cover"
                  style={{
                    objectPosition: `${imageFocus?.x ?? 50}% ${imageFocus?.y ?? 50}%`,
                  }}
                  sizes="128px"
                  quality={85}
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
                  }}
                />
              </div>
              {showStackBadge && (
                <span className="absolute -right-0.5 -top-0.5 z-[2] flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-[#e8365d] px-1 text-[10px] font-bold text-white shadow-md">
                  {stackSize}
                </span>
              )}
            </div>
          </>
        }
      />
    </PinMarkerRoot>
  )
}
