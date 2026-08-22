"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import { submitAddPlaceToSceneContributionAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import { listFictionScenesForContributeAction } from "@/src/scenes/infrastructure/next/scene.actions"
import { getFictionPlacesAction } from "@/src/places/infrastructure/next/place.actions"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributeStepHeader } from "@/components/contribute/contribute-step-header"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import { PlacePhotoFictionPicker } from "@/components/contribute/photo/place-photo-fiction-picker"
import { SceneContributePlacesStep } from "@/components/contribute/scene/scene-contribute-places-step"
import { SceneContributePlacesOrderStep } from "@/components/contribute/scene/scene-contribute-places-order-step"
import { ScenePlaceContributeScenePicker } from "@/components/contribute/scene-place/scene-place-contribute-scene-picker"
import { ScenePlaceContributePublicPreview } from "@/components/contribute/scene-place/scene-place-contribute-public-preview"
import { ScenePlaceContributeDoneView } from "@/components/contribute/scene-place/scene-place-contribute-done-view"
import { CONTRIBUTION_FPP } from "@/src/contributions/domain/contribution.config"

const TOTAL_STEPS = 5

const stepVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
}

type ScenePlaceContributeWizardProps = {
  initialFictions: FictionWithMedia[]
  /** Deep link from a place page: fiction + place already picked, starts on the scene step. */
  prefill?: { fictionId: string; place: Place } | null
}

export function ScenePlaceContributeWizard({
  initialFictions,
  prefill = null,
}: ScenePlaceContributeWizardProps) {
  const t = useTranslations("Contribute.scenePlace")
  const [step, setStep] = useState(prefill ? 2 : 1)
  const [fictionId, setFictionId] = useState(prefill?.fictionId ?? "")
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>(
    prefill ? [prefill.place] : [],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [doneVariant, setDoneVariant] = useState<"pending" | "approved" | null>(null)

  const sceneId = selectedScene?.id ?? ""

  const fiction = useMemo(
    () => initialFictions.find((f) => f.id === fictionId) ?? null,
    [fictionId, initialFictions],
  )
  const fictionTitle = fiction?.title ?? ""

  const linkedPlaceIds = useMemo(
    () => selectedScene?.places.map((p) => p.placeId) ?? [],
    [selectedScene],
  )

  // Warm Next data cache for scenes + places as soon as a fiction is chosen (parallel, not step-gated).
  useEffect(() => {
    if (!fictionId) return
    void listFictionScenesForContributeAction(fictionId)
    void getFictionPlacesAction(fictionId)
  }, [fictionId])

  const validateStep = useCallback(
    (s: number): boolean => {
      const next: Record<string, string> = {}
      if (s === 1 && !fictionId) next.fictionId = t("fictionRequired")
      if (s === 2 && !sceneId) next.sceneId = t("sceneRequired")
      if ((s === 3 || s === 4) && selectedPlaces.length === 0) next.places = t("placeRequired")
      setErrors(next)
      return Object.keys(next).length === 0
    },
    [fictionId, sceneId, selectedPlaces.length, t],
  )

  /** Shortcut from a place page skips the fiction step (1). */
  const visibleSteps = prefill ? [2, 3, 4, 5] : [1, 2, 3, 4, 5]
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

  async function handleSubmit() {
    if (!validateStep(4) || !sceneId || selectedPlaces.length === 0) return
    setSubmitting(true)
    setErrors({})
    try {
      const fd = new FormData()
      fd.set("sceneId", sceneId)
      fd.set("placeIds", JSON.stringify(selectedPlaces.map((p) => p.id)))
      const res = await submitAddPlaceToSceneContributionAction(fd)
      if (!res.success) {
        setErrors({ submit: res.error })
        return
      }
      setDoneVariant(res.autoApproved ? "approved" : "pending")
    } finally {
      setSubmitting(false)
    }
  }

  if (doneVariant) {
    const sceneHref =
      fiction?.slug && sceneId
        ? `/fictions/${fiction.slug}/scenes/${sceneId}`
        : "/profile/contribute"
    return (
      <FictionContributeLayout leftAside={null} rightAside={null}>
        <div className="flex min-h-[50vh] w-full items-center justify-center px-4 py-10">
          <ScenePlaceContributeDoneView
            variant={doneVariant}
            sceneTitle={selectedScene?.title ?? ""}
            placeNames={selectedPlaces.map((p) => p.name)}
            sceneHref={sceneHref}
          />
        </div>
      </FictionContributeLayout>
    )
  }

  const fppPerPlace = CONTRIBUTION_FPP.add_place_to_scene
  const previewSrc =
    selectedScene?.previewUrl?.trim() || selectedScene?.videoUrl?.trim() || null
  return (
    <FictionContributeLayout leftAside={null} rightAside={null} mainColumnScroll={false}>
      <ContributionWizardShell
        stepIndex={stepIndex}
        totalSteps={visibleSteps.length}
        contentMaxWidthClassName="max-w-3xl"
        footerNav={{
          showBack: stepIndex > 0,
          onBack: handleBack,
          isLastStep: step === TOTAL_STEPS,
          onNext: handleNext,
          onSubmit: () => void handleSubmit(),
          submitLabel: step === TOTAL_STEPS ? t("submit") : undefined,
          disabled: submitting || (step === 2 && !fictionId) || (step === 3 && !sceneId),
          loading: submitting,
          showTrailingArrow: step < TOTAL_STEPS,
        }}
      >
        {stepIndex === 0 ? (
          <div className="mb-6 text-sm text-muted-foreground">{t("fppHint", { count: fppPerPlace })}</div>
        ) : null}

        {step !== TOTAL_STEPS ? (
          <ContributeStepHeader
            title={t(`step${step}Title` as "step1Title")}
            description={t(`step${step}Description` as "step1Description")}
            badge="required"
            stepNumber={stepIndex + 1}
            totalSteps={visibleSteps.length}
            variant="minimal"
          />
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={step !== TOTAL_STEPS ? "mt-8" : undefined}
          >
            {step === 1 ? (
              <PlacePhotoFictionPicker
                fictions={initialFictions}
                fictionId={fictionId}
                onSelect={(id) => {
                  setFictionId(id)
                  setSelectedScene(null)
                  setSelectedPlaces([])
                }}
                error={errors.fictionId}
                emptyListMessage="noFictionsApproved"
              />
            ) : null}

            {step === 2 && fictionId ? (
              <ScenePlaceContributeScenePicker
                fictionId={fictionId}
                fictionTitle={fictionTitle}
                sceneId={sceneId}
                onSelect={(scene) => {
                  setSelectedScene(scene)
                  const alreadyLinked = scene.places.some((p) => p.placeId === prefill?.place.id)
                  setSelectedPlaces(prefill && !alreadyLinked ? [prefill.place] : [])
                }}
                error={errors.sceneId}
              />
            ) : null}

            {step === 3 && fictionId ? (
              <SceneContributePlacesStep
                fictionId={fictionId}
                fictionTitle={fictionTitle}
                selectedPlaces={selectedPlaces}
                onChange={setSelectedPlaces}
                disabledPlaceIds={linkedPlaceIds}
                error={errors.places}
              />
            ) : null}

            {step === 4 && fictionId ? (
              <SceneContributePlacesOrderStep
                fictionId={fictionId}
                selectedPlaces={selectedPlaces}
                onChange={setSelectedPlaces}
                mapId="contribute-add-place-to-scene-order-map"
              />
            ) : null}

            {step === 5 && fictionId ? (
              <div className="space-y-4">
                <ScenePlaceContributePublicPreview
                  fictionId={fictionId}
                  fictionTitle={fictionTitle}
                  sceneTitle={selectedScene?.title ?? ""}
                  videoPreviewUrl={previewSrc}
                  places={selectedPlaces}
                />
                {errors.submit ? <p className="text-sm text-destructive">{errors.submit}</p> : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </ContributionWizardShell>
    </FictionContributeLayout>
  )
}
