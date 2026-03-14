"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { DragDropZone } from "./drag-drop-zone"
import { cn } from "@/lib/utils"

export interface CoverCrop {
  x: number
  y: number
  scale: number
}

interface CoverCropperProps {
  previewUrl?: string | null
  crop: CoverCrop
  onFileChange: (file?: File) => void
  onCropChange: (crop: CoverCrop) => void
  aspect?: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function CoverCropper({
  previewUrl,
  crop,
  onFileChange,
  onCropChange,
  aspect = 2 / 3,
}: CoverCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [baseScale, setBaseScale] = useState(1)
  const baseScaleRef = useRef(1)
  const cropRef = useRef(crop)
  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef({ x: 0, y: 0, cropX: 0, cropY: 0 })

  useEffect(() => {
    cropRef.current = crop
  }, [crop])

  const overscan = 1.05
  const clampCrop = useCallback(
    (next: CoverCrop, baseOverride?: number) => {
      const container = containerRef.current
      const image = imageRef.current
      if (!container || !image) return next
      const { width: cw, height: ch } = container.getBoundingClientRect()
      const iw = image.naturalWidth || 1
      const ih = image.naturalHeight || 1
      const scale = Math.max(next.scale, baseOverride ?? baseScaleRef.current)
      const displayW = iw * scale
      const displayH = ih * scale
      const maxX = Math.max(0, (displayW - cw) / 2)
      const maxY = Math.max(0, (displayH - ch) / 2)
      return {
        ...next,
        scale,
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      }
    },
    [baseScale],
  )

  const updateBaseScale = useCallback(() => {
    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image) return
    const { width: cw, height: ch } = container.getBoundingClientRect()
    const iw = image.naturalWidth
    const ih = image.naturalHeight
    if (!iw || !ih) return
    const nextBase = Math.max(cw / iw, ch / ih) * overscan
    if (Math.abs(nextBase - baseScaleRef.current) < 0.001) return
    baseScaleRef.current = nextBase
    setBaseScale(nextBase)
    const currentCrop = cropRef.current
    const nextCrop = clampCrop(
      { ...currentCrop, scale: Math.max(currentCrop.scale, nextBase) },
      nextBase,
    )
    if (
      nextCrop.x !== currentCrop.x ||
      nextCrop.y !== currentCrop.y ||
      nextCrop.scale !== currentCrop.scale
    ) {
      onCropChange(nextCrop)
    }
  }, [clampCrop, onCropChange])

  useEffect(() => {
    updateBaseScale()
  }, [previewUrl, updateBaseScale])

  useEffect(() => {
    const handleResize = () => updateBaseScale()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateBaseScale])

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!previewUrl) return
    setIsDragging(true)
    dragState.current = {
      x: event.clientX,
      y: event.clientY,
      cropX: crop.x,
      cropY: crop.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isDragging) return
    const dx = event.clientX - dragState.current.x
    const dy = event.clientY - dragState.current.y
    onCropChange(clampCrop({ ...crop, x: dragState.current.cropX + dx, y: dragState.current.cropY + dy }))
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFileChange(file)
  }

  const zoomValue = baseScale ? clamp(crop.scale / baseScale, 1, 2) : 1

  return (
    <div className="space-y-4">
      {!previewUrl && (
        <DragDropZone
          onFilesSelected={(files) => onFileChange(files[0])}
          accept="image/*"
          maxSize={10 * 1024 * 1024}
          multiple={false}
          preview={false}
        />
      )}

      {previewUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Drag to reposition inside the frame.</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-semibold text-foreground hover:opacity-80 transition-colors"
            >
              Replace cover
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
          <div className="rounded-lg border border-border bg-background/70 p-3">
            <div className="mx-auto max-w-[280px]">
              <AspectRatio ratio={aspect}>
                <div
                  ref={containerRef}
                  className={cn(
                    "relative h-full w-full overflow-hidden rounded-md bg-muted/30 touch-none",
                    isDragging ? "cursor-grabbing" : "cursor-grab",
                  )}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <div className="pointer-events-none absolute inset-0 z-10">
                    <div className="absolute inset-y-0 left-1/3 w-px bg-white/10" />
                    <div className="absolute inset-y-0 left-2/3 w-px bg-white/10" />
                    <div className="absolute inset-x-0 top-1/3 h-px bg-white/10" />
                    <div className="absolute inset-x-0 top-2/3 h-px bg-white/10" />
                  </div>
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Cover preview"
                    onLoad={updateBaseScale}
                    draggable={false}
                    className="absolute left-1/2 top-1/2 select-none pointer-events-none"
                    style={{
                      transform: `translate(-50%, -50%) translate(${crop.x}px, ${crop.y}px) scale(${Math.max(
                        crop.scale,
                        baseScale,
                      )})`,
                    }}
                  />
                </div>
              </AspectRatio>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-10">Zoom</span>
            <input
              type="range"
              min={1}
              max={2}
              step={0.01}
              value={zoomValue}
              onChange={(e) =>
                onCropChange(
                  clampCrop({
                    ...crop,
                    scale: baseScale * parseFloat(e.target.value),
                  }),
                )
              }
              className="flex-1 accent-foreground"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {Math.round(zoomValue * 100)}%
            </span>
          </div>
        </div>
      )}

      {!previewUrl && (
        <p className="text-xs text-muted-foreground">
          Upload a cover to crop it to the standard ratio.
        </p>
      )}
    </div>
  )
}
