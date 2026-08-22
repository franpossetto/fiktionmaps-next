"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { submitLinkPlaceRelationshipContributionAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import { getFictionPlacesAction } from "@/src/places/infrastructure/next/place.actions"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributeStepHeader } from "@/components/contribute/contribute-step-header"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import { PlacePhotoFictionPicker } from "@/components/contribute/photo/place-photo-fiction-picker"
import { CONTRIBUTION_FPP } from "@/src/contributions/domain/contribution.config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

const stepVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
}

type Kind = "shared_clone" | "composite"

type PlaceRelationshipContributeWizardProps = {
  initialFictions: FictionWithMedia[]
  /** Deep link from a place page: fiction + source place already picked. */
  prefill?: { fictionId: string; placeId: string } | null
}

export function PlaceRelationshipContributeWizard({
  initialFictions,
  prefill = null,
}: PlaceRelationshipContributeWizardProps) {
  const t = useTranslations("Contribute.placeRelationship")
  const [step, setStep] = useState(1)
  const [kind, setKind] = useState<Kind | "">("")
  const [fictionId, setFictionId] = useState(prefill?.fictionId ?? "")
  const [places, setPlaces] = useState<Place[]>([])
  const [sourcePlaceId, setSourcePlaceId] = useState(prefill?.placeId ?? "")
  const [targetFictionId, setTargetFictionId] = useState("")
  const [placeName, setPlaceName] = useState("")
  const [description, setDescription] = useState("")
  const [relationshipName, setRelationshipName] = useState("")
  const [placeAId, setPlaceAId] = useState(prefill?.placeId ?? "")
  const [placeBId, setPlaceBId] = useState("")
  const [groupName, setGroupName] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [doneVariant, setDoneVariant] = useState<"pending" | "approved" | null>(null)

  const fpp = CONTRIBUTION_FPP.link_place_relationship

  const fiction = useMemo(
    () => initialFictions.find((f) => f.id === fictionId) ?? null,
    [fictionId, initialFictions],
  )
  const targetOptions = useMemo(
    () => initialFictions.filter((f) => f.id !== fictionId),
    [fictionId, initialFictions],
  )
  /** Shortcut from a place page skips the fiction (2) and source place (3) steps. */
  const visibleSteps = useMemo(() => {
    if (prefill) return kind === "composite" ? [1, 3] : [1, 4]
    return kind === "composite" ? [1, 2, 3] : [1, 2, 3, 4]
  }, [kind, prefill])
  const stepIndex = Math.max(0, visibleSteps.indexOf(step))
  const totalSteps = visibleSteps.length

  useEffect(() => {
    if (!fictionId) {
      setPlaces([])
      return
    }
    void getFictionPlacesAction(fictionId).then(setPlaces)
  }, [fictionId])

  useEffect(() => {
    const place = places.find((p) => p.id === sourcePlaceId)
    if (!place) return
    setPlaceName((prev) => prev || place.name)
    setDescription((prev) => prev || place.description)
    setRelationshipName((prev) => prev || place.name)
  }, [sourcePlaceId, places])

  const validateStep = useCallback(
    (s: number): boolean => {
      const next: Record<string, string> = {}
      if (s === 1 && !kind) next.kind = t("kindRequired")
      if (s === 2 && !fictionId) next.fictionId = t("fictionRequired")
      if (s === 3) {
        if (kind === "shared_clone" && !sourcePlaceId) next.sourcePlaceId = t("placeRequired")
        if (kind === "composite") {
          if (!placeAId || !placeBId) next.places = t("twoPlacesRequired")
          else if (placeAId === placeBId) next.places = t("distinctPlacesRequired")
          if (!groupName.trim()) next.groupName = t("groupNameRequired")
        }
      }
      if (s === 4 && kind === "shared_clone") {
        if (!targetFictionId) next.targetFictionId = t("targetFictionRequired")
        if (!placeName.trim()) next.placeName = t("placeNameRequired")
        if (!description.trim()) next.description = t("descriptionRequired")
      }
      setErrors(next)
      return Object.keys(next).length === 0
    },
    [
      kind,
      fictionId,
      sourcePlaceId,
      targetFictionId,
      placeName,
      description,
      placeAId,
      placeBId,
      groupName,
      t,
    ],
  )

  function handleBack() {
    const previous = visibleSteps[stepIndex - 1]
    if (previous) setStep(previous)
  }

  function handleNext() {
    if (!validateStep(step)) return
    if (kind === "composite" && step === 3) {
      void handleSubmit()
      return
    }
    const next = visibleSteps[stepIndex + 1]
    if (next) setStep(next)
  }

  async function handleSubmit() {
    const reviewStep = kind === "composite" ? 3 : 4
    if (!validateStep(reviewStep) || !kind) return
    setSubmitting(true)
    setErrors({})
    try {
      const payload =
        kind === "shared_clone"
          ? {
              kind: "shared_clone" as const,
              sourcePlaceId,
              targetFictionId,
              placeName,
              description,
              relationshipName: relationshipName.trim() || placeName,
            }
          : {
              kind: "composite" as const,
              placeAId,
              placeBId,
              groupName,
            }
      const res = await submitLinkPlaceRelationshipContributionAction(payload)
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
    return (
      <FictionContributeLayout leftAside={null} rightAside={null}>
        <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-4 px-4 py-10">
          <h2 className="text-xl font-bold text-foreground">
            {doneVariant === "approved" ? t("doneApprovedTitle") : t("donePendingTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {doneVariant === "approved" ? t("doneApprovedBody") : t("donePendingBody")}
          </p>
          <Button asChild variant="cta" className="w-fit">
            <Link href="/profile/contribute">{t("backToHub")}</Link>
          </Button>
        </div>
      </FictionContributeLayout>
    )
  }

  const isLastStep =
    (kind === "shared_clone" && step === 4) || (kind === "composite" && step === 3)

  return (
    <FictionContributeLayout leftAside={null} rightAside={null} mainColumnScroll={false}>
      <ContributionWizardShell
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        contentMaxWidthClassName="max-w-3xl"
        footerNav={{
          showBack: step > 1,
          onBack: handleBack,
          isLastStep,
          onNext: handleNext,
          onSubmit: () => void handleSubmit(),
          submitLabel: t("submit"),
          disabled: submitting,
          loading: submitting,
          showTrailingArrow: !isLastStep,
        }}
      >
        <div className="mb-6 text-sm text-muted-foreground">{t("fppHint", { count: fpp })}</div>

        <ContributeStepHeader
          title={t(`step${step}Title` as "step1Title")}
          description={t(`step${step}Description` as "step1Description")}
          badge="required"
          stepNumber={stepIndex + 1}
          totalSteps={totalSteps}
          variant="minimal"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={`${kind}-${step}`}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mt-8 space-y-4"
          >
            {step === 1 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["shared_clone", "kindSharedTitle", "kindSharedBody"],
                    ["composite", "kindCompositeTitle", "kindCompositeBody"],
                  ] as const
                ).map(([value, titleKey, bodyKey]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setKind(value)
                      setErrors({})
                    }}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      kind === value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-foreground/40",
                    )}
                  >
                    <p className="font-medium text-foreground">{t(titleKey)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t(bodyKey)}</p>
                  </button>
                ))}
                {errors.kind ? <p className="text-sm text-destructive sm:col-span-2">{errors.kind}</p> : null}
              </div>
            ) : null}

            {step === 2 ? (
              <PlacePhotoFictionPicker
                fictions={initialFictions}
                fictionId={fictionId}
                onSelect={(id) => {
                  setFictionId(id)
                  setSourcePlaceId("")
                  setPlaceAId("")
                  setPlaceBId("")
                }}
                error={errors.fictionId}
                emptyListMessage="noFictionsApproved"
              />
            ) : null}

            {step === 3 && kind === "shared_clone" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("fictionContext", { title: fiction?.title ?? "" })}
                </p>
                <PlacePickList
                  places={places}
                  selectedId={sourcePlaceId}
                  onSelect={setSourcePlaceId}
                  emptyLabel={t("noPlaces")}
                />
                {errors.sourcePlaceId ? (
                  <p className="text-sm text-destructive">{errors.sourcePlaceId}</p>
                ) : null}
              </>
            ) : null}

            {step === 3 && kind === "composite" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("fictionContext", { title: fiction?.title ?? "" })}
                </p>
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">{t("placeA")}</p>
                  <PlacePickList
                    places={places}
                    selectedId={placeAId}
                    onSelect={setPlaceAId}
                    emptyLabel={t("noPlaces")}
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">{t("placeB")}</p>
                  <PlacePickList
                    places={places.filter((p) => p.id !== placeAId)}
                    selectedId={placeBId}
                    onSelect={setPlaceBId}
                    emptyLabel={t("noPlaces")}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">{t("groupName")}</label>
                  <Input
                    className="mt-1"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                {errors.places ? <p className="text-sm text-destructive">{errors.places}</p> : null}
                {errors.groupName ? (
                  <p className="text-sm text-destructive">{errors.groupName}</p>
                ) : null}
                {errors.submit ? <p className="text-sm text-destructive">{errors.submit}</p> : null}
              </div>
            ) : null}

            {step === 4 && kind === "shared_clone" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">{t("targetFiction")}</label>
                  <select
                    value={targetFictionId}
                    onChange={(e) => setTargetFictionId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                  >
                    <option value="">{t("pickFiction")}</option>
                    {targetOptions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title}
                      </option>
                    ))}
                  </select>
                  {errors.targetFictionId ? (
                    <p className="mt-1 text-sm text-destructive">{errors.targetFictionId}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">{t("placeName")}</label>
                  <Input
                    className="mt-1"
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                  />
                  {errors.placeName ? (
                    <p className="mt-1 text-sm text-destructive">{errors.placeName}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">{t("description")}</label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  {errors.description ? (
                    <p className="mt-1 text-sm text-destructive">{errors.description}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    {t("sharedGroupName")}
                  </label>
                  <Input
                    className="mt-1"
                    value={relationshipName}
                    onChange={(e) => setRelationshipName(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("noImageHint")}</p>
                {errors.submit ? <p className="text-sm text-destructive">{errors.submit}</p> : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </ContributionWizardShell>
    </FictionContributeLayout>
  )
}

function PlacePickList({
  places,
  selectedId,
  onSelect,
  emptyLabel,
}: {
  places: Place[]
  selectedId: string
  onSelect: (id: string) => void
  emptyLabel: string
}) {
  if (places.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <ul className="space-y-2">
      {places.map((place) => (
        <li key={place.id}>
          <button
            type="button"
            onClick={() => onSelect(place.id)}
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors",
              selectedId === place.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-foreground/40",
            )}
          >
            <span className="font-medium text-foreground">{place.name}</span>
            {place.location.address ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {place.location.address}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  )
}
