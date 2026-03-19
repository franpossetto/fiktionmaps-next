"use client"

import { useState, useCallback, useEffect } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import type { Location } from "@/src/locations"
import { Button } from "@/components/ui/button"
import { LocationImageCropper } from "./location-image-cropper"

interface PlaceEditViewProps {
  location: Location
  onBack: () => void
  onSaved: () => void
  onSubmit: (placeId: string, image: File) => Promise<{ success: boolean; error?: string }>
  submitError: string | null
}

export function PlaceEditView({
  location,
  onBack,
  onSaved,
  onSubmit,
  submitError,
}: PlaceEditViewProps) {
  const [imageFile, setImageFile] = useState<File | undefined>(undefined)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const currentImageUrl =
    location.image && location.image !== "/placeholder.svg" ? location.image : null
  const displayUrl = filePreviewUrl ?? (imageFile ? null : currentImageUrl)

  useEffect(() => {
    if (!imageFile) {
      setFilePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setFilePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const handleSubmit = useCallback(async () => {
    if (!imageFile) {
      onBack()
      return
    }
    setSaving(true)
    const result = await onSubmit(location.id, imageFile)
    setSaving(false)
    if (result.success) {
      onSaved()
      onBack()
    }
  }, [location.id, imageFile, onSubmit, onSaved, onBack])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Edit place</h2>
          <p className="text-sm text-muted-foreground">{location.name}</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload or replace the image for this place. It will be used on the map and in the place detail.
        </p>
        <LocationImageCropper
          file={imageFile}
          previewUrl={displayUrl}
          onFileChange={(file) => setImageFile(file)}
          onRemove={() => setImageFile(undefined)}
          aspect={3 / 2}
        />
      </div>

      {submitError && (
        <p className="text-sm text-red-500" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="cta"
          onClick={handleSubmit}
          disabled={saving || !imageFile}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save image"
          )}
        </Button>
      </div>
    </div>
  )
}
