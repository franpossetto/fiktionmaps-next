"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const pinDropShadow = { filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }

/**
 * 2D pin layout: chrome uses flex-col-reverse so the pointer (first child) stays at
 * the map anchor; the image grows upward. Label is anchored to the pointer tip.
 */
export function Pin2dMarkerColumn({
  preview,
  className,
  chrome,
  label,
  labelInteractive = false,
}: {
  preview?: boolean
  className?: string
  /** DOM order: pointer, then image/bubble (renders image above pointer). */
  chrome: ReactNode
  label?: ReactNode
  /** When true, the label can receive clicks (e.g. city name → enter city). */
  labelInteractive?: boolean
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center",
        !preview && "cursor-pointer",
        className,
      )}
    >
      <div
        className="relative flex flex-col-reverse items-center transition-all duration-200"
        style={pinDropShadow}
      >
        {chrome}
        {label != null ? (
          <div
            className={cn(
              "absolute left-1/2 top-full z-10 w-max max-w-[160px] -translate-x-1/2",
              labelInteractive ? "pointer-events-auto" : "pointer-events-none",
            )}
          >
            {label}
          </div>
        ) : null}
      </div>
    </div>
  )
}
