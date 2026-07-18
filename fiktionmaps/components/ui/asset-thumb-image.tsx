"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import {
  ensureXsOnce,
  type EnsureXsTarget,
} from "@/lib/asset-images/ensure-xs-client"
import { cn } from "@/lib/utils"

export type AssetThumbEnsureTarget = EnsureXsTarget

type AssetThumbImageProps = {
  src: string
  alt?: string
  /** CSS pixel size of the square (or short side) display box. */
  size: number
  className?: string
  /**
   * When set, lazily generates and stores an `xs` variant if missing.
   * Does not block first paint — swaps src when ready.
   */
  ensure?: AssetThumbEnsureTarget
}

/**
 * Tiny asset thumbnails: next/image with explicit dimensions + optional xs backfill.
 */
export function AssetThumbImage({
  src,
  alt = "",
  size,
  className,
  ensure,
}: AssetThumbImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src)

  useEffect(() => {
    setCurrentSrc(src)
  }, [src])

  useEffect(() => {
    if (!ensure?.entityId) return
    // Local / static placeholders cannot derive an xs variant.
    if (currentSrc.startsWith("/") || currentSrc.startsWith("blob:")) return

    let cancelled = false
    void ensureXsOnce(ensure).then((result) => {
      if (cancelled || !result.success) return
      if (result.url) setCurrentSrc(result.url)
    })
    return () => {
      cancelled = true
    }
  }, [ensure, ensure?.entityType, ensure?.entityId, ensure?.role, currentSrc])

  const sizes = `${size}px`

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={size}
      height={size}
      sizes={sizes}
      quality={85}
      className={cn("h-full w-full object-cover", className)}
    />
  )
}
