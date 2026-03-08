"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { DragDropZone } from "./drag-drop-zone"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CoverCrop } from "./cover-cropper"

interface LocationImageCropperProps {
  file?: File
  previewUrl?: string | null
  acceptedUrl?: string | null
  crop: CoverCrop
  onFileChange: (file?: File) => void
  onCropChange: (crop: CoverCrop) => void
  onAccept: (dataUrl: string) => void
  onRemove: () => void
  aspect?: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function LocationImageCropper({
  file,
  previewUrl,
  acceptedUrl,
  crop,
  onFileChange,
  onCropChange,
  onAccept,
  onRemove,
  aspect = 2 / 3,
}: LocationImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [baseScale, setBaseScale] = useState(1)
  const baseScaleRef = useRef(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef({ x: 0, y: 0, cropX: 0, cropY: 0 })

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
    [],
  )

  const updateBaseScale = useCallback(() => {
    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image) return
    const { width: cw, height: ch } = container.getBoundingClientRect()
    const iw = image.naturalWidth
    const ih = image.naturalHeight
    if (!iw || !ih) return
    const nextBase = Math.max(cw / iw, ch / ih) * 1.05
    if (Math.abs(nextBase - baseScaleRef.current) < 0.001) return
    baseScaleRef.current = nextBase
    setBaseScale(nextBase)
    onCropChange(clampCrop({ ...crop, scale: Math.max(crop.scale, nextBase) }, nextBase))
  }, [clampCrop, crop, onCropChange])

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

  const handleAccept = () => {
    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image) return
    const { width: cw, height: ch } = container.getBoundingClientRect()
    const iw = image.naturalWidth
    const ih = image.naturalHeight
    const scale = Math.max(crop.scale, baseScaleRef.current)
    const displayW = iw * scale
    const displayH = ih * scale
    const centerX = cw / 2 + crop.x
    const centerY = ch / 2 + crop.y
    const imageLeft = centerX - displayW / 2
    const imageTop = centerY - displayH / 2
    const srcX = clamp((0 - imageLeft) / scale, 0, iw)
    const srcY = clamp((0 - imageTop) / scale, 0, ih)
    const srcW = clamp(cw / scale, 0, iw)
    const srcH = clamp(ch / scale, 0, ih)
    const outputW = 960
    const outputH = Math.round(outputW / aspect)
    const canvas = document.createElement("canvas")
    canvas.width = outputW
    canvas.height = outputH
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, outputW, outputH)
    onAccept(canvas.toDataURL("image/jpeg", 0.9))
  }

  if (!previewUrl && !acceptedUrl) {
    return (
      <DragDropZone
        onFilesSelected={(files) => onFileChange(files[0])}
        accept="image/*"
        maxSize={10 * 1024 * 1024}
        multiple={false}
        preview={false}
      />
    )
  }

  if (previewUrl && !acceptedUrl) {
    const zoomValue = baseScale ? clamp(crop.scale / baseScale, 1, 2) : 1
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-background/70 p-3">
          <div className="mx-auto max-w-[420px]">
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
                  alt="Location preview"
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
            className="flex-1 accent-cyan-500"
          />
          <span className="text-xs text-muted-foreground w-12 text-right">
            {Math.round(zoomValue * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={onRemove} className="flex-1">
            Cancel
          </Button>
          <Button type="button" onClick={handleAccept} className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
            Accept Crop
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <DragDropZone
        onFilesSelected={(files) => onFileChange(files[0])}
        accept="image/*"
        maxSize={10 * 1024 * 1024}
        multiple={false}
        preview={false}
      />
      {acceptedUrl && (
        <div className="flex items-center gap-3">
          <div className="h-16 w-24 overflow-hidden rounded-md border border-border bg-muted/30">
            <img src={acceptedUrl} alt="Accepted preview" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="outline" onClick={onRemove}>
              Remove
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={(e) => onFileChange(e.target.files?.[0])}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  )
}
