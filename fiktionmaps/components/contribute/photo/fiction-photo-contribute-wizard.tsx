"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { getFictionPhotoContributeContextAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import { submitFictionAddPhotoContributionAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { FictionContributeDoneView } from "@/components/contribute/fiction/fiction-contribute-done-view"
import { ContributeStepHeader } from "@/components/contribute/contribute-step-header"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import { PlaceContributePhotoField } from "@/components/contribute/place/place-contribute-photo-field"
import { PlacePhotoFictionPicker } from "@/components/contribute/photo/place-photo-fiction-picker"
import { loadImageDimensionsFromFile } from "@/lib/images/load-image-dimensions-from-file"
import { validatePlaceContributeImageFile } from "@/components/contribute/place/place-contribute-image-schema"
import {
  isBannerAspectRatioOk,
  isBannerReadableResolutionOk,
  isCoverAspectRatioOk,
  isCoverReadableResolutionOk,
} from "@/components/contribute/fiction/fiction-contribute-step1-schema"
import { CONTRIBUTION_FPP } from "@/src/contributions/domain/contribution.config"

const TOTAL_STEPS = 3

const stepVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
}

export type FictionPhotoContributeTarget = "cover" | "hero"

type FictionPhotoContributeWizardProps = {
  target: FictionPhotoContributeTarget
  initialFictions: FictionWithMedia[]
}

export function FictionPhotoContributeWizard({ target, initialFictions }: FictionPhotoContributeWizardProps) {
  const t = useTranslations(`Contribute.photo.fiction.${target}`)
  const tVal = useTranslations("Contribute.validation")
  const [step, setStep] = useState(1)
  const [fictionId, setFictionId] = useState("")
  const [fictionContext, setFictionContext] = useState<Awaited<
    ReturnType<typeof getFictionPhotoContributeContextAction>
  > | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [photoInspecting, setPhotoInspecting] = useState(false)
  const [photoDims, setPhotoDims] = useState<{ width: number; height: number } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [doneVariant, setDoneVariant] = useState<"pending" | "approved" | null>(null)
  const [donePreview, setDonePreview] = useState<string | null>(null)

  const targetRole = target === "cover" ? "cover" : "banner"
  const isCover = target === "cover"

  useEffect(() => {
    return () => {
      if (photoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(photoPreviewUrl)
    }
  }, [photoPreviewUrl])

  const loadFictionContext = useCallback(async (id: string) => {
    setContextLoading(true)
    try {
      const ctx = await getFictionPhotoContributeContextAction(id)
      setFictionContext(ctx)
    } finally {
      setContextLoading(false)
    }
  }, [])

  useEffect(() => {
    if (step === 2 && fictionId) void loadFictionContext(fictionId)
  }, [step, fictionId, loadFictionContext])

  const fictionTitle = useMemo(
    () => initialFictions.find((f) => f.id === fictionId)?.title ?? fictionContext?.fictionTitle ?? "",
    [fictionId, fictionContext?.fictionTitle, initialFictions],
  )

  const fictionSlug = useMemo(
    () => initialFictions.find((f) => f.id === fictionId)?.slug ?? fictionContext?.fictionSlug ?? "",
    [fictionId, fictionContext?.fictionSlug, initialFictions],
  )

  const currentImageUrl = isCover
    ? (fictionContext?.currentCoverUrl ?? null)
    : (fictionContext?.currentBannerUrl ?? null)

  const validateStep = useCallback(
    (s: number): boolean => {
      const next: Record<string, string> = {}
      if (s === 1 && !fictionId) next.fictionId = t("fictionRequired")
      if (s === 2) {
        if (!photoFile) {
          next.photoFile = t("photoRequired")
        } else {
          const fmt = validatePlaceContributeImageFile(photoFile, {
            imageFormatInvalid: tVal("imageFormatInvalid"),
            imageTooLarge: tVal("imageTooLarge"),
          })
          if (fmt) next.photoFile = fmt
          else if (isCover) {
            if (!photoDims || !isCoverAspectRatioOk(photoDims.width, photoDims.height)) {
              next.photoFile = tVal("coverAspectInvalid")
            } else if (!isCoverReadableResolutionOk(photoDims.width, photoDims.height)) {
              next.photoFile = tVal("imageResolutionLow")
            }
          } else if (!photoDims || !isBannerAspectRatioOk(photoDims.width, photoDims.height)) {
            next.photoFile = tVal("bannerAspectInvalid")
          } else if (!isBannerReadableResolutionOk(photoDims.width, photoDims.height)) {
            next.photoFile = tVal("imageResolutionLow")
          }
        }
      }
      setErrors(next)
      return Object.keys(next).length === 0
    },
    [fictionId, isCover, photoDims, photoFile, t, tVal],
  )

  function handleBack() {
    if (step > 1) setStep((s) => s - 1)
  }

  function handleNext() {
    if (!validateStep(step)) return
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
  }

  async function handlePhotoFile(file: File) {
    setPhotoInspecting(true)
    setErrors((e) => {
      const next = { ...e }
      delete next.photoFile
      return next
    })
    try {
      const dims = await loadImageDimensionsFromFile(file)
      setPhotoDims(dims)
      setPhotoFile(file)
      if (photoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(photoPreviewUrl)
      setPhotoPreviewUrl(URL.createObjectURL(file))
    } catch {
      setErrors((e) => ({
        ...e,
        photoFile: isCover ? tVal("coverImageLoadFailed") : tVal("bannerImageLoadFailed"),
      }))
    } finally {
      setPhotoInspecting(false)
    }
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoDims(null)
    if (photoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(null)
  }

  async function handleSubmit() {
    if (!validateStep(2) || !photoFile || !fictionId) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.set("fictionId", fictionId)
      fd.set("targetRole", targetRole)
      fd.set("photoFile", photoFile)
      const res = await submitFictionAddPhotoContributionAction(fd)
      if (!res.success) {
        setErrors({ submit: res.error })
        return
      }
      setDoneVariant(res.autoApproved ? "approved" : "pending")
      setDonePreview(res.previewUrl)
      if (photoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(photoPreviewUrl)
    } finally {
      setSubmitting(false)
    }
  }

  if (doneVariant) {
    return (
      <FictionContributeLayout leftAside={null} rightAside={null}>
        <div className="flex min-h-[50vh] w-full items-center justify-center px-4 py-10">
          <FictionContributeDoneView
            variant={doneVariant}
            title={fictionTitle}
            coverSrc={donePreview}
            fictionHref={fictionSlug ? `/fictions/${fictionSlug}` : "/profile/contribute"}
          />
        </div>
      </FictionContributeLayout>
    )
  }

  const fpp = CONTRIBUTION_FPP.add_photo

  return (
    <FictionContributeLayout leftAside={null} rightAside={null} mainColumnScroll={false}>
      <ContributionWizardShell
        stepIndex={step - 1}
        totalSteps={TOTAL_STEPS}
        contentMaxWidthClassName="max-w-lg"
        footerNav={{
          showBack: step > 1,
          onBack: handleBack,
          isLastStep: step === TOTAL_STEPS,
          onNext: handleNext,
          onSubmit: handleSubmit,
          submitLabel: step === TOTAL_STEPS ? t("submit") : undefined,
          disabled: submitting || (step === 2 && contextLoading),
          loading: submitting,
          showTrailingArrow: step < TOTAL_STEPS,
        }}
      >
        {step === 1 ? (
          <div className="mb-6 rounded-lg border border-border/60 bg-muted/20 px-4 py-3.5 text-sm text-muted-foreground">
            {t("fppHint", { count: fpp })}
          </div>
        ) : null}

        <ContributeStepHeader
          title={t(`step${step}Title`)}
          description={t(`step${step}Description`)}
          badge="required"
          stepNumber={step}
          totalSteps={TOTAL_STEPS}
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
                emptyListMessage="noFictionsApproved"
                onSelect={(id) => {
                  setFictionId(id)
                  setFictionContext(null)
                }}
                error={errors.fictionId}
              />
            ) : null}

            {step === 2 ? (
              <div className="space-y-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t("selectedFiction", { title: fictionTitle })}
                </p>
                {contextLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t("loadingImages")}</p>
                ) : (
                  <>
                    <div className={currentImageUrl ? "grid grid-cols-2 items-start gap-3" : undefined}>
                      {currentImageUrl ? (
                        <div className="min-w-0 space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t("currentImageLabel")}
                          </p>
                          <div
                            className={
                              isCover
                                ? "relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-border bg-muted"
                                : "relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border bg-muted"
                            }
                          >
                            <Image
                              src={currentImageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes={isCover ? "50vw" : "50vw"}
                            />
                          </div>
                        </div>
                      ) : null}
                      <div className={currentImageUrl ? "min-w-0 space-y-2" : undefined}>
                        {currentImageUrl ? (
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t("summaryNewImage")}
                          </p>
                        ) : null}
                        <PlaceContributePhotoField
                          layout={isCover ? "fiction-cover" : "fiction-banner"}
                          aspectHint={t("aspectHint")}
                          previewUrl={photoPreviewUrl}
                          inspecting={photoInspecting}
                          onPickFile={(file) => void handlePhotoFile(file)}
                          onClear={clearPhoto}
                          inline={Boolean(currentImageUrl)}
                          className={currentImageUrl ? "space-y-0" : undefined}
                        />
                      </div>
                    </div>
                    {currentImageUrl ? (
                      <p className="text-center text-sm text-muted-foreground">{t("replacingCurrent")}</p>
                    ) : null}
                  </>
                )}
                {errors.photoFile ? (
                  <p className="text-center text-sm text-destructive">{errors.photoFile}</p>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-6 text-sm">
                <dl className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                  <div className="px-4 py-3.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("summaryFiction")}
                    </dt>
                    <dd className="mt-1 font-medium text-foreground">{fictionTitle}</dd>
                  </div>
                  <div className="px-4 py-3.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("summaryImageType")}
                    </dt>
                    <dd className="mt-1 font-medium text-foreground">{t("summaryImageTypeValue")}</dd>
                  </div>
                </dl>
                {photoPreviewUrl ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("summaryNewImage")}
                    </p>
                    <div
                      className={
                        isCover
                          ? "relative mx-auto aspect-[2/3] w-full max-w-[200px] overflow-hidden rounded-xl border border-border"
                          : "relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border"
                      }
                    >
                      <Image src={photoPreviewUrl} alt="" fill className="object-cover" unoptimized sizes={isCover ? "200px" : "480px"} />
                    </div>
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
