"use client"

import { useRef, useState } from "react"
import { DragDropZone } from "./drag-drop-zone"
import { Button } from "@/components/ui/button"
import { ImageFocusPicker } from "@/components/ui/image-focus-picker"
import {
  DEFAULT_IMAGE_FOCUS,
  type ImageFocus,
} from "@/lib/asset-images/image-focus"

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
  focus?: ImageFocus | null
  onFocusChange?: (focus: ImageFocus) => void
}

export function LocationImageCropper({
  file,
  previewUrl,
  onFileChange,
  onRemove,
  aspect = 3 / 2,
  focus,
  onFocusChange,
}: LocationImageCropperProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const displayUrl = previewUrl ?? null
  const [localFocus, setLocalFocus] = useState(focus ?? DEFAULT_IMAGE_FOCUS)
  const currentFocus = focus ?? localFocus

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
      {displayUrl ? (
        <ImageFocusPicker
          src={displayUrl}
          aspectRatio={`${aspect}`}
          focus={currentFocus}
          onFocusChange={(next) => {
            setLocalFocus(next)
            onFocusChange?.(next)
          }}
        />
      ) : null}
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
