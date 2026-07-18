"use client"

import Image from "next/image"
import { getPin2dHoverInnerPx } from "@/lib/map/pin-marker-hover-scale"
import {
  pin2dPointerColorClass,
  pin2dPointerSizeClass,
  pinStrokeBorderClass,
} from "@/lib/map/pin-marker-styles"
import { cn } from "@/lib/utils"
import { PinMarkerLabel } from "../pin-marker-label"
import { Pin2dMarkerColumn } from "../pin-2d-marker-column"
import { shouldShowPinLabel } from "../should-show-pin-label"
import type { PlaceMarker2dProps } from "../types"
import { PinMarkerRoot } from "../motion"

/** Square 2D pin (settings: marker2dShape = square). */
export function PlaceMarker2dSquare({
  imageSrc,
  label,
  labelMode,
  hoverScaleMode,
  isSelected,
  isHovered,
  stackSize,
  preview,
}: PlaceMarker2dProps) {
  const showStackBadge = stackSize != null && stackSize > 1
  const hoverInnerPx = getPin2dHoverInnerPx(hoverScaleMode)
  const showLabel = shouldShowPinLabel(labelMode, { preview, isSelected, isHovered })
  const labelAnimates = labelMode !== "always"
  const idleFrameClass = pinStrokeBorderClass
  const idlePointerClass = pin2dPointerColorClass

  const squareSizeStyle =
    isHovered && !isSelected
      ? { width: hoverInnerPx, height: hoverInnerPx }
      : undefined

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
              className={cn(
                "h-0 w-0 shrink-0 transition-colors",
                pin2dPointerSizeClass,
                isSelected ? "border-t-primary" : idlePointerClass,
              )}
            />
            <div
              className={cn(
                "relative shrink-0 overflow-hidden rounded-lg transition-all duration-200",
                isSelected
                  ? "h-16 w-16 border-[3px] border-primary shadow-[0_0_0_3px_hsl(36_90%_55%/0.3)]"
                  : cn("h-14 w-14", idleFrameClass),
              )}
              style={squareSizeStyle}
            >
              <Image
                src={imageSrc}
                alt={label}
                fill
                className="object-cover"
                sizes="128px"
                quality={85}
              />
              {showStackBadge && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-[#e8365d] px-1 text-[10px] font-bold text-white shadow-md">
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
