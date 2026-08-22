"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { createContributorSceneAction } from "@/src/scenes/infrastructure/next/scene.actions"
import { uploadSceneVideoPair } from "@/lib/asset-videos/upload-scene-videos"
import { buildTimecodeLabel, type TimecodeParts } from "@/lib/scenes/scene-timecode"
import { SceneTimecodeInput } from "@/components/admin/scene-timecode-input"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { ContributeStepHeader } from "@/components/contribute/contribute-step-header"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import { SceneContributePlacesStep } from "@/components/contribute/scene/scene-contribute-places-step"
import { SceneContributePlacesOrderStep } from "@/components/contribute/scene/scene-contribute-places-order-step"
import { SceneContributeVideoField } from "@/components/contribute/scene/scene-contribute-video-field"
import { validateSceneContributeVideoFile } from "@/components/contribute/scene/scene-contribute-video-schema"
import {
  SceneContributeStepsAside,
  type SceneContributeFormStep,
} from "@/components/contribute/scene/scene-contribute-steps-aside"
import { SceneContributeCriteriaAside } from "@/components/contribute/scene/scene-contribute-criteria-aside"
import { SceneContributeFppRewardCompactStrip } from "@/components/contribute/scene/scene-contribute-fpp-reward-card"
import { SceneContributePublicPreview } from "@/components/contribute/scene/scene-contribute-public-preview"
import { SceneContributeDoneView } from "@/components/contribute/scene/scene-contribute-done-view"
import { cn } from "@/lib/utils"

const INPUT_ROW =
  "h-11 w-full shrink-0 rounded-xl border border-border bg-card px-4 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
const INPUT_AREA =
  "min-h-[100px] w-full resize-y rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"

const TOTAL_STEPS = 8

const stepVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const

export interface SceneContributeWizardProps {
  initialFictions: FictionWithMedia[]
  /** Deep link from a place page: fiction + place already picked, starts on the video step. */
  prefill?: { fictionId: string; place: Place } | null
}

type Draft = {
  fictionId: string
  fictionSearch: string
  /** Ordered route stops for the scene. */
  places: Place[]
  /** Original pick (UI name / local preview while compressing). */
  videoFile: File | null
  /** Compressed outputs ready for upload. */
  processedVideoFile: File | null
  processedPreviewFile: File | null
  title: string
  timecode: TimecodeParts
  season: string
  episode: string
  episodeTitle: string
  description: string
  quote: string
}

function emptyDraft(): Draft {
  return {
    fictionId: "",
    fictionSearch: "",
    places: [],
    videoFile: null,
    processedVideoFile: null,
    processedPreviewFile: null,
    title: "",
    timecode: { h: "", m: "", s: "" },
    season: "",
    episode: "",
    episodeTitle: "",
    description: "",
    quote: "",
  }
}

export function SceneContributeWizard({
  initialFictions,
  prefill = null,
}: SceneContributeWizardProps) {
  const t = useTranslations("Contribute.scene")
  const tVal = useTranslations("Contribute.validation")

  const [step, setStep] = useState<SceneContributeFormStep>(prefill ? 4 : 1)
  const [done, setDone] = useState<{
    variant: "pending" | "approved"
    title: string
    videoPreviewUrl: string | null
    sceneHref: string
  } | null>(null)

  const [draft, setDraft] = useState<Draft>(() =>
    prefill
      ? { ...emptyDraft(), fictionId: prefill.fictionId, places: [prefill.place] }
      : emptyDraft(),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [videoProcessing, setVideoProcessing] = useState(false)
  const [videoProcessingPercent, setVideoProcessingPercent] = useState<number | null>(null)
  const processGenRef = useRef(0)

  useEffect(() => {
    const file = draft.processedVideoFile ?? draft.videoFile
    if (file) {
      const url = URL.createObjectURL(file)
      setVideoPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setVideoPreviewUrl(null)
  }, [draft.processedVideoFile, draft.videoFile])

  const filteredFictions = useMemo(() => {
    const q = draft.fictionSearch.trim().toLowerCase()
    if (!q) return initialFictions
    return initialFictions.filter((f) => f.title.toLowerCase().includes(q))
  }, [draft.fictionSearch, initialFictions])

  const selectedFiction = useMemo(
    () => initialFictions.find((f) => f.id === draft.fictionId) ?? null,
    [draft.fictionId, initialFictions],
  )

  const isTv = selectedFiction?.type === "tv-series"

  const handleVideoFile = useCallback(
    (file: File) => {
      setSubmitError(null)
      setErrors((prev) => {
        const next = { ...prev }
        delete next.videoFile
        return next
      })
      const err = validateSceneContributeVideoFile(file, {
        videoFormatInvalid: tVal("videoFormatInvalid"),
        videoTooLarge: tVal("videoTooLarge"),
      })
      if (err) {
        processGenRef.current += 1
        setVideoProcessing(false)
        setVideoProcessingPercent(null)
        setDraft((p) => ({
          ...p,
          videoFile: null,
          processedVideoFile: null,
          processedPreviewFile: null,
        }))
        setErrors((prev) => ({ ...prev, videoFile: err }))
        return
      }

      const gen = ++processGenRef.current
      setDraft((p) => ({
        ...p,
        videoFile: file,
        processedVideoFile: null,
        processedPreviewFile: null,
      }))
      setVideoProcessing(true)
      setVideoProcessingPercent(0)

      void (async () => {
        try {
          const { processSceneVideoClient } = await import("@/lib/video/client-video-processor")
          const result = await processSceneVideoClient(file, (p) => {
            if (processGenRef.current !== gen) return
            setVideoProcessingPercent(p.percent)
          })
          if (processGenRef.current !== gen) return
          setDraft((p) => ({
            ...p,
            processedVideoFile: result.videoFile,
            processedPreviewFile: result.previewFile,
          }))
        } catch (e) {
          if (processGenRef.current !== gen) return
          setDraft((p) => ({
            ...p,
            videoFile: null,
            processedVideoFile: null,
            processedPreviewFile: null,
          }))
          setErrors((prev) => ({
            ...prev,
            videoFile: e instanceof Error ? e.message : t("videoProcessFailed"),
          }))
        } finally {
          if (processGenRef.current === gen) {
            setVideoProcessing(false)
            setVideoProcessingPercent(null)
          }
        }
      })()
    },
    [t, tVal],
  )

  const clearVideo = useCallback(() => {
    processGenRef.current += 1
    setVideoProcessing(false)
    setVideoProcessingPercent(null)
    setDraft((p) => ({
      ...p,
      videoFile: null,
      processedVideoFile: null,
      processedPreviewFile: null,
    }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next.videoFile
      return next
    })
  }, [])

  const validateStep = useCallback(
    (s: SceneContributeFormStep): boolean => {
      const next: Record<string, string> = {}
      if (s === 1 && !draft.fictionId) next.fictionId = t("fictionRequired")
      if ((s === 2 || s === 3) && draft.places.length === 0) next.places = t("placeRequired")
      if (s === 4) {
        if (videoProcessing) {
          next.videoFile = t("videoProcessingWait")
        } else if (!draft.processedVideoFile || !draft.processedPreviewFile) {
          next.videoFile = t("videoRequired")
        }
      }
      if (s === 5 && !draft.title.trim()) next.title = t("titleRequired")
      if (s === 6) {
        const label = buildTimecodeLabel(draft.timecode)
        if (!label) next.timecode = t("timecodeRequired")
        if (isTv) {
          const seasonNum = draft.season.trim() ? Number(draft.season) : Number.NaN
          const episodeNum = draft.episode.trim() ? Number(draft.episode) : Number.NaN
          if (!Number.isFinite(seasonNum) || seasonNum <= 0) next.season = t("seasonRequired")
          if (!Number.isFinite(episodeNum) || episodeNum <= 0) next.episode = t("episodeRequired")
        }
      }
      if (s === 7 && !draft.description.trim()) next.description = t("descriptionRequired")
      setErrors(next)
      return Object.keys(next).length === 0
    },
    [draft, isTv, t, videoProcessing],
  )

  const handleNext = useCallback(() => {
    setSubmitError(null)
    if (!validateStep(step)) return
    if (step < TOTAL_STEPS) setStep((s) => (s + 1) as SceneContributeFormStep)
  }, [step, validateStep])

  const handleBack = useCallback(() => {
    setSubmitError(null)
    if (step > 1) setStep((s) => (s - 1) as SceneContributeFormStep)
  }, [step])

  const submitScene = useCallback(async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (!draft.processedVideoFile || !draft.processedPreviewFile) {
        throw new Error(t("videoRequired"))
      }
      const { videoUrl, previewUrl } = await uploadSceneVideoPair({
        video: draft.processedVideoFile,
        preview: draft.processedPreviewFile,
      })

      const timestampLabel = buildTimecodeLabel(draft.timecode)

      const fd = new FormData()
      fd.set("fictionId", draft.fictionId)
      fd.set("placeIds", JSON.stringify(draft.places.map((p) => p.id)))
      fd.set("videoUrl", videoUrl)
      fd.set("previewUrl", previewUrl)
      fd.set("title", draft.title.trim())
      fd.set("description", draft.description.trim())
      fd.set("quote", draft.quote.trim())
      fd.set("timestampLabel", timestampLabel ?? "")
      if (isTv) {
        fd.set("season", draft.season.trim())
        fd.set("episode", draft.episode.trim())
        fd.set("episodeTitle", draft.episodeTitle.trim())
      }

      const res = await createContributorSceneAction(fd)
      if (!res.success) {
        setSubmitError(res.error)
        return
      }
      setDone({
        variant: res.contributionAutoApproved ? "approved" : "pending",
        title: draft.title.trim(),
        videoPreviewUrl,
        sceneHref: `/fictions/${res.fictionSlug}/scenes/${res.sceneId}`,
      })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit scene")
    } finally {
      setSubmitting(false)
    }
  }, [draft, isTv, t, videoPreviewUrl])

  const handleSubmitClick = useCallback(() => {
    for (let s = 1; s <= 7; s++) {
      if (!validateStep(s as SceneContributeFormStep)) {
        setStep(s as SceneContributeFormStep)
        return
      }
    }
    void submitScene()
  }, [validateStep, submitScene])

  if (done) {
    return (
      <FictionContributeLayout leftAside={null} rightAside={null} mainColumnScroll>
        <div className="flex min-h-full items-center justify-center px-4 py-10">
          <SceneContributeDoneView
            variant={done.variant}
            title={done.title}
            videoPreviewUrl={done.videoPreviewUrl}
            sceneHref={done.sceneHref}
            returnHref="/map"
            returnLabel={t("backToMap")}
          />
        </div>
      </FictionContributeLayout>
    )
  }

  const leftAside = (
    <SceneContributeStepsAside step={step} onNavigate={(s) => setStep(s)} className="min-[900px]:pl-1" />
  )
  const rightAside = <SceneContributeCriteriaAside step={step} />

  const stepTitle = (() => {
    switch (step) {
      case 1:
        return t("fictionTitle")
      case 2:
        return t("placeTitle")
      case 3:
        return t("placeOrderTitle")
      case 4:
        return t("videoTitle")
      case 5:
        return t("titleStepTitle")
      case 6:
        return t("momentTitle")
      case 7:
        return t("descriptionTitle")
      case 8:
        return t("previewTitle")
    }
  })()

  const stepLead = (() => {
    switch (step) {
      case 1:
        return t("fictionDescription")
      case 2:
        return t("placeDescription")
      case 3:
        return t("placeOrderDescription")
      case 4:
        return t("videoDescription")
      case 5:
        return t("titleStepDescription")
      case 6:
        return t("momentDescription")
      case 7:
        return t("descriptionDescription")
      case 8:
        return t("previewDescription")
    }
  })()

  return (
    <FictionContributeLayout leftAside={leftAside} rightAside={rightAside} mainColumnScroll={false}>
      <ContributionWizardShell
        stepIndex={step - 1}
        totalSteps={TOTAL_STEPS}
        contentMaxWidthClassName="max-w-3xl"
        footerNav={{
          showBack: step > 1,
          onBack: handleBack,
          isLastStep: step === TOTAL_STEPS,
          onNext: handleNext,
          onSubmit: handleSubmitClick,
          submitLabel: step === TOTAL_STEPS ? t("previewSubmit") : undefined,
          backLabel: step === TOTAL_STEPS ? t("previewBack") : undefined,
          disabled: submitting || videoProcessing,
          loading: submitting,
          showTrailingArrow: step < TOTAL_STEPS,
        }}
      >
        {step !== 8 ? (
          <div className="min-[900px]:hidden">
            <SceneContributeFppRewardCompactStrip className="mb-4" />
          </div>
        ) : null}

        {step !== 8 ? (
          <ContributeStepHeader
            title={stepTitle ?? ""}
            description={stepLead ?? ""}
            badge="required"
            stepNumber={step}
            totalSteps={TOTAL_STEPS}
            variant="minimal"
          />
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div key={step} variants={stepVariants} initial="initial" animate="animate" exit="exit">
            {step === 1 ? (
              <div className="space-y-4">
                <input
                  type="search"
                  value={draft.fictionSearch}
                  onChange={(e) => setDraft((p) => ({ ...p, fictionSearch: e.target.value }))}
                  placeholder={t("fictionSearchPlaceholder")}
                  className={INPUT_ROW}
                />
                <ContributeFieldWrapper label={t("stepFiction")} required error={errors.fictionId}>
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
                    {filteredFictions.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          setDraft((p) => ({ ...p, fictionId: f.id, places: [] }))
                        }
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          draft.fictionId === f.id
                            ? "bg-primary/10 font-medium text-foreground"
                            : "hover:bg-muted/60",
                        )}
                      >
                        {f.title}
                      </button>
                    ))}
                  </div>
                </ContributeFieldWrapper>
              </div>
            ) : null}

            {step === 2 ? (
              <SceneContributePlacesStep
                fictionId={draft.fictionId}
                fictionTitle={selectedFiction?.title ?? ""}
                selectedPlaces={draft.places}
                onChange={(places) => setDraft((p) => ({ ...p, places }))}
                error={errors.places}
              />
            ) : null}

            {step === 3 ? (
              <SceneContributePlacesOrderStep
                fictionId={draft.fictionId}
                selectedPlaces={draft.places}
                onChange={(places) => setDraft((p) => ({ ...p, places }))}
                mapId="contribute-scene-order-map"
              />
            ) : null}

            {step === 4 ? (
              <div className="w-full space-y-3">
                <ContributeFieldWrapper label={t("videoTitle")} required error={errors.videoFile}>
                  <SceneContributeVideoField
                    previewUrl={videoPreviewUrl}
                    fileName={draft.videoFile?.name}
                    inspecting={videoProcessing}
                    processingPercent={videoProcessingPercent}
                    processingLabel={videoProcessing ? t("videoProcessing") : null}
                    onPickFile={handleVideoFile}
                    onClear={clearVideo}
                  />
                </ContributeFieldWrapper>
              </div>
            ) : null}

            {step === 5 ? (
              <ContributeFieldWrapper label={t("titleFieldLabel")} required error={errors.title}>
                <input
                  className={INPUT_ROW}
                  value={draft.title}
                  placeholder={t("titlePlaceholder")}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                />
              </ContributeFieldWrapper>
            ) : null}

            {step === 6 ? (
              <div className="space-y-5">
                <ContributeFieldWrapper label={t("timecodeFieldLabel")} required error={errors.timecode}>
                  <SceneTimecodeInput
                    value={draft.timecode}
                    onChange={(timecode) => setDraft((p) => ({ ...p, timecode }))}
                    labels={{
                      hours: t("timecodeHours"),
                      minutes: t("timecodeMinutes"),
                      seconds: t("timecodeSeconds"),
                    }}
                  />
                </ContributeFieldWrapper>

                {isTv ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <ContributeFieldWrapper label={t("seasonLabel")} required error={errors.season}>
                      <input
                        type="number"
                        min={1}
                        className={INPUT_ROW}
                        value={draft.season}
                        onChange={(e) => setDraft((p) => ({ ...p, season: e.target.value }))}
                      />
                    </ContributeFieldWrapper>
                    <ContributeFieldWrapper label={t("episodeLabel")} required error={errors.episode}>
                      <input
                        type="number"
                        min={1}
                        className={INPUT_ROW}
                        value={draft.episode}
                        onChange={(e) => setDraft((p) => ({ ...p, episode: e.target.value }))}
                      />
                    </ContributeFieldWrapper>
                    <ContributeFieldWrapper label={t("episodeTitleLabel")}>
                      <input
                        className={INPUT_ROW}
                        value={draft.episodeTitle}
                        onChange={(e) => setDraft((p) => ({ ...p, episodeTitle: e.target.value }))}
                      />
                    </ContributeFieldWrapper>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 7 ? (
              <div className="space-y-4">
                <ContributeFieldWrapper label={t("descriptionFieldLabel")} required error={errors.description}>
                  <textarea
                    className={INPUT_AREA}
                    rows={5}
                    value={draft.description}
                    onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                  />
                </ContributeFieldWrapper>
                <ContributeFieldWrapper label={t("quoteFieldLabel")}>
                  <textarea
                    className={INPUT_AREA}
                    rows={2}
                    placeholder={t("quotePlaceholder")}
                    value={draft.quote}
                    onChange={(e) => setDraft((p) => ({ ...p, quote: e.target.value }))}
                  />
                </ContributeFieldWrapper>
              </div>
            ) : null}

            {step === 8 ? (
              <div className="w-full space-y-3">
                {submitError ? <p className="text-center text-xs text-destructive">{submitError}</p> : null}

                <SceneContributeFppRewardCompactStrip className="min-[900px]:hidden" />

                <SceneContributePublicPreview
                  fictionTitle={selectedFiction?.title ?? ""}
                  placeNames={draft.places.map((p) => p.name || p.location.name)}
                  title={draft.title}
                  timecodeLabel={buildTimecodeLabel(draft.timecode)}
                  isTv={isTv}
                  season={draft.season}
                  episode={draft.episode}
                  episodeTitle={draft.episodeTitle}
                  description={draft.description}
                  quote={draft.quote}
                  videoPreviewUrl={videoPreviewUrl}
                />
              </div>
            ) : null}

            {submitError && step !== 8 ? (
              <p className="mt-4 text-sm text-destructive">{submitError}</p>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </ContributionWizardShell>
    </FictionContributeLayout>
  )
}
