"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { PlacePhotoContributeContext } from "@/src/places/infrastructure/next/place.actions"
import { getPlacePhotoContributeContextAction } from "@/src/places/infrastructure/next/place.actions"
import { submitPlaceAddPhotoContributionAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributeStepHeader } from "@/components/contribute/contribute-step-header"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import { PlaceContributePhotoField } from "@/components/contribute/place/place-contribute-photo-field"
import { PlaceContributeDoneView } from "@/components/contribute/place/place-contribute-done-view"
import { PlacePhotoFictionPicker } from "@/components/contribute/photo/place-photo-fiction-picker"
import { PlacePhotoPlacePicker } from "@/components/contribute/photo/place-photo-place-picker"
import { loadImageDimensionsFromFile } from "@/lib/images/load-image-dimensions-from-file"
import {
  isPlaceHeroAspectRatioOk,
  isPlaceHeroReadableResolutionOk,
  validatePlaceContributeImageFile,
} from "@/components/contribute/place/place-contribute-image-schema"
import { CONTRIBUTION_FPP } from "@/src/contributions/domain/contribution.config"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"

const TOTAL_STEPS = 4

const stepVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
}

type PlacePhotoContributeWizardProps = {
  initialFictions: FictionWithMedia[]
  /** Deep link from a place page: fiction + place already picked, starts on the upload step. */
  prefill?: { fictionId: string; place: Place } | null
}

function stepTitle(step: number, t: ReturnType<typeof useTranslations<"Contribute.photo">>): string {
  switch (step) {
    case 1:
      return t("step1Title")
    case 2:
      return t("step2Title")
    case 3:
      return t("step3Title")
    case 4:
      return t("step4Title")
    default:
      return ""
  }
}

function stepDescription(step: number, t: ReturnType<typeof useTranslations<"Contribute.photo">>): string {
  switch (step) {
    case 1:
      return t("step1Description")
    case 2:
      return t("step2Description")
    case 3:
      return t("step3Description")
    case 4:
      return t("step4Description")
    default:
      return ""
  }
}

export function PlacePhotoContributeWizard({
  initialFictions,
  prefill = null,
}: PlacePhotoContributeWizardProps) {
  const t = useTranslations("Contribute.photo")
  const tPlace = useTranslations("Contribute.place")
  const tVal = useTranslations("Contribute.validation")
  const [step, setStep] = useState(prefill ? 3 : 1)
  const [fictionId, setFictionId] = useState(prefill?.fictionId ?? "")
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(prefill?.place ?? null)
  const [placeContext, setPlaceContext] = useState<PlacePhotoContributeContext | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photoInspecting, setPhotoInspecting] = useState(false)
  const [photoDims, setPhotoDims] = useState<{ width: number; height: number } | null>(null)
  const [photoFocus, setPhotoFocus] = useState({ x: 50, y: 50 })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [doneVariant, setDoneVariant] = useState<"pending" | "approved" | null>(null)

  const placeId = selectedPlace?.id ?? ""

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const loadPlaceContext = useCallback(async (id: string) => {
    setContextLoading(true)
    try {
      const ctx = await getPlacePhotoContributeContextAction(id)
      setPlaceContext(ctx)
    } finally {
      setContextLoading(false)
    }
  }, [])

  useEffect(() => {
    if (step === 3 && placeId) void loadPlaceContext(placeId)
  }, [step, placeId, loadPlaceContext])

  const fictionTitle = useMemo(
    () => initialFictions.find((f) => f.id === fictionId)?.title ?? "",
    [fictionId, initialFictions],
  )

  const currentImageUrl = placeContext?.currentImageUrl ?? null

  const validateStep = useCallback(
    (s: number): boolean => {
      const next: Record<string, string> = {}
      if (s === 1 && !fictionId) next.fictionId = t("fictionRequired")
      if (s === 2 && !placeId) next.placeId = t("placeRequired")
      if (s === 3) {
        if (!imageFile) {
          next.image = t("photoRequired")
        } else {
          const fmt = validatePlaceContributeImageFile(imageFile, {
            imageFormatInvalid: tVal("imageFormatInvalid"),
            imageTooLarge: tVal("imageTooLarge"),
          })
          if (fmt) next.image = fmt
          else if (!photoDims || !isPlaceHeroAspectRatioOk(photoDims.width, photoDims.height)) {
            next.image = tVal("placePhotoAspectInvalid")
          } else if (!isPlaceHeroReadableResolutionOk(photoDims.width, photoDims.height)) {
            next.image = tVal("imageResolutionLow")
          }
        }
      }
      setErrors(next)
      return Object.keys(next).length === 0
    },
    [fictionId, imageFile, photoDims, placeId, t, tVal],
  )

  /** Shortcut from a place page skips the fiction (1) and place (2) steps. */
  const visibleSteps = prefill ? [3, 4] : [1, 2, 3, 4]
  const stepIndex = Math.max(0, visibleSteps.indexOf(step))

  function handleBack() {
    const previous = visibleSteps[stepIndex - 1]
    if (previous) setStep(previous)
  }

  function handleNext() {
    if (!validateStep(step)) return
    const next = visibleSteps[stepIndex + 1]
    if (next) setStep(next)
  }

  async function handlePhotoFile(file: File) {
    setPhotoInspecting(true)
    setErrors((e) => {
      const next = { ...e }
      delete next.image
      return next
    })
    try {
      const dims = await loadImageDimensionsFromFile(file)
      setPhotoDims(dims)
      setImageFile(file)
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(file))
    } catch {
      setErrors((e) => ({ ...e, image: tVal("placePhotoImageLoadFailed") }))
    } finally {
      setPhotoInspecting(false)
    }
  }

  function clearPhoto() {
    setImageFile(null)
    setPhotoDims(null)
    setPhotoFocus({ x: 50, y: 50 })
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  async function handleSubmit() {
    if (!validateStep(3) || !imageFile || !placeId) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.set("placeId", placeId)
      fd.set("imageFile", imageFile)
      fd.set("focusX", String(photoFocus.x))
      fd.set("focusY", String(photoFocus.y))
      const res = await submitPlaceAddPhotoContributionAction(fd)
      if (!res.success) {
        setErrors({ submit: res.error })
        return
      }
      // Keep the local blob for the done screen. After auto-approve, pending
      // storage is promoted and deleted, so `res.previewUrl` 404s.
      setDoneVariant(res.autoApproved ? "approved" : "pending")
    } finally {
      setSubmitting(false)
    }
  }

  if (doneVariant) {
    return (
      <FictionContributeLayout leftAside={null} rightAside={null}>
        <div className="flex min-h-[50vh] w-full items-center justify-center px-4 py-10">
          <PlaceContributeDoneView
            variant={doneVariant}
            placeName={selectedPlace?.name ?? ""}
            imageSrc={previewUrl}
            placeHref={
              selectedPlace?.slug && fictionId
                ? `/fictions/${initialFictions.find((f) => f.id === fictionId)?.slug ?? fictionId}/places/${selectedPlace.slug}`
                : "/profile/contribute"
            }
          />
        </div>
      </FictionContributeLayout>
    )
  }

  const fpp = CONTRIBUTION_FPP.add_photo

  return (
    <FictionContributeLayout leftAside={null} rightAside={null} mainColumnScroll={false}>
      <ContributionWizardShell
        stepIndex={stepIndex}
        totalSteps={visibleSteps.length}
        contentMaxWidthClassName="max-w-lg"
        footerNav={{
          showBack: stepIndex > 0,
          onBack: handleBack,
          isLastStep: step === TOTAL_STEPS,
          onNext: handleNext,
          onSubmit: handleSubmit,
          submitLabel: step === TOTAL_STEPS ? t("submit") : undefined,
          disabled: submitting || (step === 3 && contextLoading) || (step === 2 && !fictionId),
          loading: submitting,
          showTrailingArrow: step < TOTAL_STEPS,
        }}
      >
        {stepIndex === 0 ? (
          <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 px-4 py-3.5 text-sm text-muted-foreground">
            {t("fppHint", { count: fpp })}
          </div>
        ) : null}

        <ContributeStepHeader
          title={stepTitle(step, t)}
          description={stepDescription(step, t)}
          badge="required"
          stepNumber={stepIndex + 1}
          totalSteps={visibleSteps.length}
          variant="minimal"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mt-8"
          >
            {step === 1 ? (
              <PlacePhotoFictionPicker
                fictions={initialFictions}
                fictionId={fictionId}
                onSelect={(id) => {
                  setFictionId(id)
                  setSelectedPlace(null)
                  setPlaceContext(null)
                }}
                error={errors.fictionId}
              />
            ) : null}

            {step === 2 && fictionId ? (
              <PlacePhotoPlacePicker
                fictionId={fictionId}
                fictionTitle={fictionTitle}
                placeId={placeId}
                onSelect={(place) => {
                  setSelectedPlace(place)
                  setPlaceContext(null)
                }}
                error={errors.placeId}
              />
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("selectedPlace", { name: selectedPlace?.name ?? "", fiction: fictionTitle })}
                </p>
                {contextLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t("loadingPlaceImages")}</p>
                ) : currentImageUrl ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("currentPhotoLabel")}
                    </p>
                    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border bg-muted">
                      <Image src={currentImageUrl} alt="" fill className="object-cover" sizes="480px" />
                    </div>
                    <p className="text-center text-sm text-muted-foreground">{t("replacingCurrent")}</p>
                  </div>
                ) : null}
                <PlaceContributePhotoField
                  previewUrl={previewUrl}
                  inspecting={photoInspecting}
                  onPickFile={(file) => void handlePhotoFile(file)}
                  onClear={clearPhoto}
                  focus={photoFocus}
                  onFocusChange={setPhotoFocus}
                />
                {errors.image ? <p className="text-center text-sm text-destructive">{errors.image}</p> : null}
                <p className="text-center text-xs leading-relaxed text-muted-foreground">{tPlace("photoAspectHint")}</p>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-6 text-sm">
                <dl className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                  <div className="px-4 py-3.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("summaryFiction")}</dt>
                    <dd className="mt-1 font-medium text-foreground">{fictionTitle}</dd>
                  </div>
                  <div className="px-4 py-3.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("summaryPlace")}</dt>
                    <dd className="mt-1 font-medium text-foreground">{selectedPlace?.name}</dd>
                  </div>
                </dl>
                {previewUrl ? (
                  <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border">
                    <Image src={previewUrl} alt="" fill className="object-cover" unoptimized sizes="480px" />
                  </div>
                ) : null}
                {errors.submit ? <p className="text-sm text-destructive">{errors.submit}</p> : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </ContributionWizardShell>
    </FictionContributeLayout>
  )
}
