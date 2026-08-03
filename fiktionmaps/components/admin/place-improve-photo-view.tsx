"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { ChevronRight, ImagePlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CurrentAssetFormatBadge } from "@/components/admin/current-asset-format-badge"
import { WizardShell } from "@/components/admin/wizard-shell"
import { ImageCodecCompare } from "@/components/admin/image-codec-compare"
import { ImageFocusPicker } from "@/components/ui/image-focus-picker"
import {
  DEFAULT_IMAGE_FOCUS,
  type ImageFocus,
} from "@/lib/asset-images/image-focus"
import type { Place } from "@/src/places/domain/place.entity"
import { uploadPlaceImageAction } from "@/src/places/infrastructure/next/place.actions"
import {
  previewImageCodecsAction,
  type ImageCodecPreviewVariant,
} from "@/src/asset-images/infrastructure/next/asset-image.actions"

const WIZARD_STEPS = [
  { title: "Replace", description: "Current + new file" },
  { title: "Compare", description: "WebP vs AVIF" },
] as const

const COMPARE_VARIANTS = ["xs", "sm", "lg"] as const

type PlaceImprovePhotoViewProps = {
  place: Place
}

function isRealPlaceImage(url: string | null | undefined): url is string {
  const trimmed = url?.trim()
  if (!trimmed) return false
  if (trimmed.endsWith("/placeholder.svg")) return false
  return true
}

export function PlaceImprovePhotoView({ place }: PlaceImprovePhotoViewProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [focus, setFocus] = useState<ImageFocus>(
    place.imageFocus ?? DEFAULT_IMAGE_FOCUS,
  )
  const [codecLoading, setCodecLoading] = useState(false)
  const [codecError, setCodecError] = useState<string | null>(null)
  const [previews, setPreviews] = useState<ImageCodecPreviewVariant[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const placeLabel = place.name?.trim() || place.location.name || "Place"
  const currentUrl = isRealPlaceImage(place.image) ? place.image : null
  const currentFocus = place.imageFocus ?? DEFAULT_IMAGE_FOCUS

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const exit = () => {
    router.push("/admin?tab=locations")
  }

  const runCodecPreview = async (nextFile: File) => {
    setCodecLoading(true)
    setCodecError(null)
    setPreviews(null)
    const fd = new FormData()
    fd.set("file", nextFile)
    fd.set("variants", COMPARE_VARIANTS.join(","))
    const result = await previewImageCodecsAction(fd)
    setCodecLoading(false)
    if (!result.success) {
      setCodecError(result.error ?? "Preview failed")
      return false
    }
    setPreviews(result.previews)
    return true
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null
    e.target.value = ""
    if (!next) return
    setFile(next)
    setFocus(DEFAULT_IMAGE_FOCUS)
    setUploadError(null)
    setPreviews(null)
    setCodecError(null)
  }

  const goToCompare = async () => {
    if (!file) return
    setUploadError(null)
    const ok = await runCodecPreview(file)
    if (ok) setStep(1)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.set("file", file)
    fd.set("focusX", String(focus.x))
    fd.set("focusY", String(focus.y))
    const result = await uploadPlaceImageAction(place.id, fd)
    setUploading(false)
    if (!result.success) {
      setUploadError(result.error ?? "Upload failed")
      return
    }
    router.push("/admin?tab=locations")
    router.refresh()
  }

  const handleBack = () => {
    if (step === 0) {
      exit()
      return
    }
    setStep(0)
  }

  return (
    <WizardShell
      title="Improve photo"
      subtitle={`${placeLabel} · replace place photo as AVIF`}
      steps={[...WIZARD_STEPS]}
      currentStep={step}
      onBack={handleBack}
      backLabel={step === 0 ? "← Back to places" : "← Back"}
      onCancel={exit}
      cancelLabel="Cancel"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {step === 0 ? (
        <div className="space-y-6">
          <div>
            <h2 className="mb-1 text-lg font-bold text-foreground">Replace photo</h2>
            <p className="text-sm text-muted-foreground">
              Current on the left, new photo + focus on the right (3:2).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Current
              </p>
              {currentUrl ? (
                <div className="mx-auto w-full max-w-[320px] space-y-2">
                  <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentUrl}
                      alt="Current place photo"
                      className="aspect-[3/2] w-full object-cover"
                      style={{
                        objectPosition: `${currentFocus.x}% ${currentFocus.y}%`,
                      }}
                    />
                  </div>
                  <CurrentAssetFormatBadge url={currentUrl} />
                </div>
              ) : (
                <div className="mx-auto flex aspect-[3/2] w-full max-w-[320px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  No photo yet
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                New
              </p>
              {!file ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mx-auto flex aspect-[3/2] w-full max-w-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-muted/20"
                >
                  <ImagePlus className="h-8 w-8" />
                  Upload new photo
                </button>
              ) : previewUrl ? (
                <ImageFocusPicker
                  src={previewUrl}
                  aspectRatio="3 / 2"
                  focus={focus}
                  onFocusChange={setFocus}
                  alt="Place photo focus"
                  className="mx-auto max-w-[320px]"
                />
              ) : null}
            </div>
          </div>

          {file ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                Choose another file
              </Button>
              <Button type="button" onClick={goToCompare} className="gap-2">
                Continue to compare
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-6">
          <div>
            <h2 className="mb-1 text-lg font-bold text-foreground">Compare codecs</h2>
            <p className="text-sm text-muted-foreground">
              AVIF q48 (upload) vs WebP reference. Previews at real pixel size.
            </p>
          </div>

          {codecLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Encoding WebP + AVIF…
            </div>
          ) : codecError ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{codecError}</p>
              <Button type="button" variant="outline" onClick={() => file && goToCompare()}>
                Retry encode
              </Button>
            </div>
          ) : previews ? (
            <ImageCodecCompare previews={previews} variants={COMPARE_VARIANTS} />
          ) : null}

          {uploadError ? (
            <p className="text-sm text-destructive" role="alert">
              {uploadError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={uploading} onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              type="button"
              disabled={uploading || codecLoading || !!codecError || !previews}
              onClick={handleUpload}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading AVIF…
                </>
              ) : (
                "Upload as AVIF"
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </WizardShell>
  )
}
