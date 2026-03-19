"use client"

import { useRef } from "react"
import { DragDropZone } from "./drag-drop-zone"
import { Button } from "@/components/ui/button"

interface LocationImageCropperProps {
  file?: File
  previewUrl?: string | null
  acceptedUrl?: string | null
  crop?: { x: number; y: number; scale: number }
  onFileChange: (file?: File) => void
  onCropChange?: (crop: { x: number; y: number; scale: number }) => void
  onAccept?: (dataUrl: string) => void
  onRemove: () => void
  aspect?: number
}

export function LocationImageCropper({
  file,
  previewUrl,
  onFileChange,
  onRemove,
  aspect = 3 / 2,
}: LocationImageCropperProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const displayUrl = previewUrl ?? null

  if (!file && !displayUrl) {
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

  return (
    <div className="space-y-3 w-full">
      <div
        className="w-full overflow-hidden rounded-md border border-border bg-muted/30"
        style={{ aspectRatio: aspect }}
      >
        {displayUrl && (
          <img
            src={displayUrl}
            alt="Place preview"
            className="h-full w-full object-cover object-center"
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="flex-1"
        >
          Replace
        </Button>
        <Button type="button" variant="outline" onClick={onRemove} className="flex-1">
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
  )
}
