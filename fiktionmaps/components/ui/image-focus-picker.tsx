"use client"

import { useCallback, useRef, useState } from "react"
import {
  DEFAULT_IMAGE_FOCUS,
  normalizeImageFocus,
  type ImageFocus,
} from "@/lib/asset-images/image-focus"
import { cn } from "@/lib/utils"

type ImageFocusPickerProps = {
  src: string
  focus?: ImageFocus | null
  onFocusChange: (focus: ImageFocus) => void
  /** CSS aspect-ratio value, e.g. "21 / 9" or "2 / 3". */
  aspectRatio: string
  className?: string
  disabled?: boolean
  alt?: string
}

/**
 * Drag-to-pan focal point inside a fixed aspect frame (CSS object-cover + object-position).
 */
export function ImageFocusPicker({
  src,
  focus,
  onFocusChange,
  aspectRatio,
  className,
  disabled = false,
  alt = "",
}: ImageFocusPickerProps) {
  const current = normalizeImageFocus(focus?.x, focus?.y)
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origin: ImageFocus
  } | null>(null)
  const [dragging, setDragging] = useState(false)

  const updateFromDelta = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current
      const frame = frameRef.current
      if (!drag || !frame) return
      const rect = frame.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const dx = ((clientX - drag.startX) / rect.width) * 100
      const dy = ((clientY - drag.startY) / rect.height) * 100
      // Dragging the image right moves focus left (same as object-position pan).
      onFocusChange(
        normalizeImageFocus(drag.origin.x - dx, drag.origin.y - dy),
      )
    },
    [onFocusChange],
  )

  return (
    <div
      ref={frameRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border bg-muted/30 touch-none select-none",
        !disabled && "cursor-grab",
        dragging && !disabled && "cursor-grabbing",
        className,
      )}
      style={{ aspectRatio }}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return
        e.preventDefault()
        frameRef.current?.setPointerCapture(e.pointerId)
        dragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          origin: current,
        }
        setDragging(true)
      }}
      onPointerMove={(e) => {
        if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return
        updateFromDelta(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => {
        if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return
        dragRef.current = null
        setDragging(false)
      }}
      onPointerCancel={() => {
        dragRef.current = null
        setDragging(false)
      }}
      onDoubleClick={() => {
        if (disabled) return
        onFocusChange(DEFAULT_IMAGE_FOCUS)
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="pointer-events-none h-full w-full object-cover"
        style={{ objectPosition: `${current.x}% ${current.y}%` }}
      />
      {!disabled ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 pb-2 pt-8 text-center text-[11px] font-medium text-white/95">
          Drag to reposition · double-click to center
        </span>
      ) : null}
    </div>
  )
}
