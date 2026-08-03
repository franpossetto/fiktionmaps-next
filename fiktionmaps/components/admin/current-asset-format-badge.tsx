"use client"

import {
  detectAssetImageFormatFromUrl,
  formatAssetImageFormatLabel,
} from "@/lib/asset-images/detect-asset-image-format"
import { cn } from "@/lib/utils"

type CurrentAssetFormatBadgeProps = {
  url: string | null | undefined
  className?: string
  /** Show skip hint when already AVIF. */
  showSkipHint?: boolean
}

export function CurrentAssetFormatBadge({
  url,
  className,
  showSkipHint = true,
}: CurrentAssetFormatBadgeProps) {
  if (!url?.trim()) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Format: none
      </p>
    )
  }

  const format = detectAssetImageFormatFromUrl(url)
  const label = formatAssetImageFormatLabel(format)
  const isAvif = format === "avif"

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground">
        Current format:{" "}
        <span
          className={cn(
            "font-semibold",
            isAvif ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
          )}
        >
          {label}
        </span>
      </p>
      {showSkipHint && isAvif ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Already AVIF — skip unless you want a new photo.
        </p>
      ) : null}
    </div>
  )
}
