"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { ChevronRight, ImagePlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WizardShell } from "@/components/admin/wizard-shell"
import { CurrentAssetFormatBadge } from "@/components/admin/current-asset-format-badge"
import { ImageCodecCompare } from "@/components/admin/image-codec-compare"
import { ImageFocusPicker } from "@/components/ui/image-focus-picker"
import {
  DEFAULT_IMAGE_FOCUS,
  type ImageFocus,
} from "@/lib/asset-images/image-focus"
import type { ImageVariant } from "@/lib/asset-images/variant-sizes"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { uploadFictionImageAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import {
  previewImageCodecsAction,
  type ImageCodecPreviewVariant,
} from "@/src/asset-images/infrastructure/next/asset-image.actions"
import { cn } from "@/lib/utils"

type PhotoRole = "cover" | "banner"

const WIZARD_STEPS = [
  { title: "Choose image", description: "Cover or hero" },
  { title: "Replace", description: "Current + new file" },
  { title: "Compare", description: "WebP vs AVIF" },
] as const

type FictionImprovePhotoViewProps = {
  fiction: FictionWithMedia
}

export function FictionImprovePhotoView({ fiction }: FictionImprovePhotoViewProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<PhotoRole | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [focus, setFocus] = useState<ImageFocus>(DEFAULT_IMAGE_FOCUS)
  const [codecLoading, setCodecLoading] = useState(false)
  const [codecError, setCodecError] = useState<string | null>(null)
  const [previews, setPreviews] = useState<ImageCodecPreviewVariant[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const compareVariants = useMemo((): readonly ImageVariant[] => {
    return role === "banner" ? (["lg"] as const) : (["xs", "sm", "lg"] as const)
  }, [role])

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
    router.push(`/admin/fiction/${fiction.id}`)
  }

  const currentUrl =
    role === "cover"
      ? fiction.coverImageLarge ?? fiction.coverImage ?? fiction.coverImageThumb ?? null
      : role === "banner"
        ? fiction.bannerImage ?? null
        : null

  const currentFocus =
    role === "cover"
      ? fiction.coverFocus ?? DEFAULT_IMAGE_FOCUS
      : role === "banner"
        ? fiction.bannerFocus ?? DEFAULT_IMAGE_FOCUS
        : DEFAULT_IMAGE_FOCUS

  const aspectRatio = role === "banner" ? "21 / 9" : "2 / 3"
  const roleLabel = role === "banner" ? "Hero" : "Cover"

  const resetFileState = () => {
    setFile(null)
    setPreviews(null)
    setCodecError(null)
    setUploadError(null)
    setCodecLoading(false)
  }

  const selectRole = (next: PhotoRole) => {
    setRole(next)
    resetFileState()
    setFocus(
      next === "cover"
        ? fiction.coverFocus ?? DEFAULT_IMAGE_FOCUS
        : fiction.bannerFocus ?? DEFAULT_IMAGE_FOCUS,
    )
    setStep(1)
  }

  const runCodecPreview = async (nextFile: File, variants: readonly ImageVariant[]) => {
    setCodecLoading(true)
    setCodecError(null)
    setPreviews(null)
    const fd = new FormData()
    fd.set("file", nextFile)
    fd.set("variants", variants.join(","))
    const result = await previewImageCodecsAction(fd)
    setCodecLoading(false)
    if (!result.success) {
      setCodecError(result.error ?? "Preview failed")
      return false
    }
    setPreviews(result.previews)
    return true
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!file || !role) return
    setUploadError(null)
    const ok = await runCodecPreview(file, compareVariants)
    if (ok) setStep(2)
  }

  const handleUpload = async () => {
    if (!file || !role) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.set("file", file)
    fd.set("focusX", String(focus.x))
    fd.set("focusY", String(focus.y))
    const result = await uploadFictionImageAction(fiction.id, role, fd)
    setUploading(false)
    if (!result.success) {
      setUploadError(result.error ?? "Upload failed")
      return
    }
    router.push("/admin?tab=fictions")
    router.refresh()
  }

  const handleBack = () => {
    if (step === 0) {
      exit()
      return
    }
    if (step === 1) {
      resetFileState()
      setRole(null)
      setStep(0)
      return
    }
    setStep(1)
  }

  return (
    <WizardShell
      title="Improve photo"
      subtitle={`${fiction.title} · replace cover or hero as AVIF`}
      steps={[...WIZARD_STEPS]}
      currentStep={step}
      onBack={handleBack}
      backLabel={step === 0 ? "← Back to edit" : "← Back"}
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
        <div className="space-y-4">
          <div>
            <h2 className="mb-1 text-lg font-bold text-foreground">Which image?</h2>
            <p className="text-sm text-muted-foreground">
              Cover is the 2:3 portrait. Hero is the wide banner.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  id: "cover" as const,
                  title: "Cover",
                  hint: "2:3 portrait · chips, lists, detail",
                  url: fiction.coverImageLarge ?? fiction.coverImage ?? null,
                },
                {
                  id: "banner" as const,
                  title: "Hero",
                  hint: "21:9 wide · detail header",
                  url: fiction.bannerImage ?? null,
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => selectRole(option.id)}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card/50 text-left transition-colors hover:border-foreground/40 hover:bg-card"
              >
                <div
                  className={cn(
                    "relative w-full bg-muted/40",
                    option.id === "cover" ? "aspect-[2/3] max-h-56" : "aspect-[21/9]",
                  )}
                >
                  {option.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={option.url}
                      alt={option.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                      No image yet
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-foreground">{option.title}</p>
                    <p className="text-xs text-muted-foreground">{option.hint}</p>
                    <CurrentAssetFormatBadge url={option.url} />
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 1 && role ? (
        <div className="space-y-6">
          <div>
            <h2 className="mb-1 text-lg font-bold text-foreground">Replace {roleLabel}</h2>
            <p className="text-sm text-muted-foreground">
              {role === "cover"
                ? "Current on the left, new cover + focus on the right."
                : "Review the current image, then upload a new file and set the focus."}
            </p>
          </div>

          {role === "cover" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current
                </p>
                {currentUrl ? (
                  <div className="mx-auto w-full max-w-[220px] space-y-2">
                    <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentUrl}
                        alt="Current cover"
                        className="aspect-[2/3] w-full object-cover"
                        style={{
                          objectPosition: `${currentFocus.x}% ${currentFocus.y}%`,
                        }}
                      />
                    </div>
                    <CurrentAssetFormatBadge url={currentUrl} />
                  </div>
                ) : (
                  <div className="mx-auto flex aspect-[2/3] w-full max-w-[220px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                    No cover yet
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
                    className="mx-auto flex aspect-[2/3] w-full max-w-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-muted/20"
                  >
                    <ImagePlus className="h-8 w-8" />
                    Upload new cover
                  </button>
                ) : previewUrl ? (
                  <ImageFocusPicker
                    src={previewUrl}
                    aspectRatio={aspectRatio}
                    focus={focus}
                    onFocusChange={setFocus}
                    alt="Cover focus"
                    className="mx-auto max-w-[220px]"
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current
                </p>
                {currentUrl ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentUrl}
                        alt={`Current ${roleLabel}`}
                        className="mx-auto max-h-[220px] w-full object-contain"
                        style={{
                          objectPosition: `${currentFocus.x}% ${currentFocus.y}%`,
                        }}
                      />
                    </div>
                    <CurrentAssetFormatBadge url={currentUrl} />
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                    No hero yet
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  New
                </p>
                {!file ? (
                  <Button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Upload new hero
                  </Button>
                ) : previewUrl ? (
                  <ImageFocusPicker
                    src={previewUrl}
                    aspectRatio={aspectRatio}
                    focus={focus}
                    onFocusChange={setFocus}
                    alt="Hero focus"
                    className="mx-auto max-w-2xl"
                  />
                ) : null}
              </div>
            </div>
          )}

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

      {step === 2 && role ? (
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
            <ImageCodecCompare previews={previews} variants={compareVariants} />
          ) : null}

          {uploadError ? (
            <p className="text-sm text-destructive" role="alert">
              {uploadError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={uploading} onClick={() => setStep(1)}>
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
                `Upload ${roleLabel} as AVIF`
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </WizardShell>
  )
}
