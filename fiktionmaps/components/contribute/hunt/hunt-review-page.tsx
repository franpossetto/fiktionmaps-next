"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"
import type { HuntPlaceReviewed, HuntReviewDecision } from "@/src/hunts/domain/hunt.types"
import {
  canPostulateCandidate,
  isCandidatePosted,
  isCandidateSkipped,
} from "@/src/hunts/domain/hunt-candidate.helpers"
import {
  clearPlaceOverrides,
  effectivePlace,
  effectiveStreetViewReference,
  isAddressOverridden,
  isCoordsOverridden,
  isNameOverridden,
  isShootEnvironmentOverridden,
  setPlaceOverrides,
} from "@/src/hunts/domain/hunt-place.helpers"
import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"
import type { StreetViewReference } from "@/src/locations/domain/location-view-reference.schemas"
import type { LatLng } from "@/lib/map/types"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import {
  HuntPlacesAside,
  HuntPlacesMobileStrip,
  type HuntReviewStatus,
} from "./hunt-places-aside"
import { HuntReviewCriteriaAside } from "./hunt-review-criteria-aside"
import { HuntPlaceReviewDetail } from "./hunt-place-review-detail"
import { HuntAssignFictionDialog } from "./hunt-assign-fiction-dialog"
import { finishHuntReviewAction, saveHuntReviewDraftAction } from "@/src/hunts/infrastructure/next/hunt.actions"
import type { HuntPlaceAddressFields } from "@/components/contribute/hunt/hunt-place-verification-panel"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

function decisionToStatus(decision?: HuntReviewDecision): HuntReviewStatus {
  return decision === "approved" ? "approved" : "pending"
}

function candidateToStatus(reviewed: HuntPlaceReviewed): HuntReviewStatus {
  if (isCandidatePosted(reviewed)) return "posted"
  if (isCandidateSkipped(reviewed)) return "skipped"
  return decisionToStatus(reviewed.review_decision)
}

type HuntReviewPageProps = {
  hunt: Hunt
  sourceId: string
  fictionId: string | null
  fictionTitle: string
  contextLabel: string | null
  sourceUrl: string
  fictions: FictionWithMedia[]
}

export function HuntReviewPage({
  hunt,
  sourceId,
  fictionId: initialFictionId,
  fictionTitle: initialFictionTitle,
  contextLabel,
  sourceUrl,
  fictions,
}: HuntReviewPageProps) {
  const router = useRouter()
  const t = useTranslations("Contribute.huntReview")

  const scrollRef = useRef<HTMLDivElement>(null)
  const [fictionId, setFictionId] = useState(initialFictionId)
  const [fictionTitle, setFictionTitle] = useState(initialFictionTitle)
  const [assignOpen, setAssignOpen] = useState(false)
  const [places, setPlaces] = useState<HuntPlaceReviewed[]>(hunt.payload.places)
  const [activeIndex, setActiveIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hunterNote, setHunterNote] = useState(hunt.hunterNote ?? "")
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const skipNextDraftSaveRef = useRef(true)

  useEffect(() => {
    setPlaces(hunt.payload.places)
    setHunterNote(hunt.hunterNote ?? "")
  }, [hunt.hunterNote, hunt.payload.places, hunt.updatedAt])

  useEffect(() => {
    if (hunt.status === "submitted" || hunt.status === "approved" || hunt.status === "rejected") {
      return
    }
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false
      return
    }

    setDraftStatus("saving")
    const timer = window.setTimeout(() => {
      void (async () => {
        const res = await saveHuntReviewDraftAction({
          huntId: hunt.id,
          places,
          hunterNote: hunterNote.trim() || null,
        })
        setDraftStatus(res.success ? "saved" : "error")
      })()
    }, 600)

    return () => window.clearTimeout(timer)
  }, [hunt.id, hunt.status, hunterNote, places])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activeIndex])

  const total = places.length
  const isLastPlace = activeIndex >= total - 1

  const isInboxMode = hunt.status === "submitted"
  const canEdit = !isInboxMode && hunt.status !== "approved" && hunt.status !== "rejected"

  const reviewStateForAside = useMemo(() => {
    const map: Record<number, HuntReviewStatus> = {}
    places.forEach((p, i) => {
      map[i] = isInboxMode ? candidateToStatus(p) : decisionToStatus(p.review_decision)
    })
    return map
  }, [isInboxMode, places])

  const getCoords = useCallback((reviewed: HuntPlaceReviewed): LatLng | null => {
    const place = effectivePlace(reviewed)
    if (place.lat != null && place.lng != null) return { lat: place.lat, lng: place.lng }
    return null
  }, [])

  const isCoordsAdjustedForIndex = useCallback(
    (index: number): boolean => {
      const reviewed = places[index]
      return reviewed ? isCoordsOverridden(reviewed) : false
    },
    [places],
  )

  const isAddressAdjustedForIndex = useCallback(
    (index: number): boolean => {
      const reviewed = places[index]
      return reviewed ? isAddressOverridden(reviewed) : false
    },
    [places],
  )

  const isNameAdjustedForIndex = useCallback(
    (index: number): boolean => {
      const reviewed = places[index]
      return reviewed ? isNameOverridden(reviewed) : false
    },
    [places],
  )

  const isShootEnvironmentAdjustedForIndex = useCallback(
    (index: number): boolean => {
      const reviewed = places[index]
      return reviewed ? isShootEnvironmentOverridden(reviewed) : false
    },
    [places],
  )

  const approvedCount = useMemo(
    () => places.filter((p) => p.review_decision === "approved").length,
    [places],
  )

  const toggleApprove = useCallback((index: number) => {
    setPlaces((prev) => {
      const next = [...prev]
      const p = next[index]
      if (!p) return prev
      next[index] = {
        ...p,
        review_decision:
          p.review_decision === "approved" ? undefined : "approved",
      }
      return next
    })
  }, [])

  const goNext = useCallback(() => setActiveIndex((i) => Math.min(i + 1, total - 1)), [total])
  const goPrev = useCallback(() => setActiveIndex((i) => Math.max(i - 1, 0)), [])

  const handleToggleApprove = useCallback(() => {
    toggleApprove(activeIndex)
    if (places[activeIndex]?.review_decision !== "approved" && !isLastPlace) goNext()
  }, [activeIndex, goNext, isLastPlace, places, toggleApprove])

  const handleReferenceChange = useCallback(
    (index: number, reference: StreetViewReference | null) => {
      setPlaces((prev) => {
        const reviewed = prev[index]
        if (!reviewed) return prev
        const next = [...prev]
        next[index] = setPlaceOverrides(reviewed, { street_view_reference: reference })
        return next
      })
    },
    [],
  )

  const handleCoordsChange = useCallback(
    (index: number, coords: LatLng, cameraReference?: StreetViewReference) => {
      setPlaces((prev) => {
        const reviewed = prev[index]
        if (!reviewed) return prev
        const next = [...prev]
        if (cameraReference) {
          next[index] = setPlaceOverrides(reviewed, {
            lat: coords.lat,
            lng: coords.lng,
            street_view_reference: cameraReference,
          })
        } else {
          next[index] = clearPlaceOverrides(
            setPlaceOverrides(reviewed, { lat: coords.lat, lng: coords.lng }),
            ["street_view_reference"],
          )
        }
        return next
      })
    },
    [],
  )

  const handleCoordsReset = useCallback((index: number) => {
    setPlaces((prev) => {
      const reviewed = prev[index]
      if (!reviewed) return prev
      const next = [...prev]
      next[index] = clearPlaceOverrides(reviewed, ["lat", "lng", "street_view_reference"])
      return next
    })
  }, [])

  const handleAddressChange = useCallback((index: number, address: HuntPlaceAddressFields) => {
    setPlaces((prev) => {
      const reviewed = prev[index]
      if (!reviewed) return prev
      const next = [...prev]
      next[index] = setPlaceOverrides(reviewed, {
        address: address.address,
        city: address.city,
        country: address.country,
      })
      return next
    })
  }, [])

  const handleFullAddressChange = useCallback(
    (index: number, data: { lat: number; lng: number; address: HuntPlaceAddressFields }) => {
      setPlaces((prev) => {
        const reviewed = prev[index]
        if (!reviewed) return prev
        const next = [...prev]
        next[index] = clearPlaceOverrides(
          setPlaceOverrides(reviewed, {
            lat: data.lat,
            lng: data.lng,
            address: data.address.address,
            city: data.address.city,
            country: data.address.country,
          }),
          ["street_view_reference"],
        )
        return next
      })
    },
    [],
  )

  const handleAddressReset = useCallback((index: number) => {
    setPlaces((prev) => {
      const reviewed = prev[index]
      if (!reviewed) return prev
      const next = [...prev]
      next[index] = clearPlaceOverrides(reviewed, ["address", "city", "country"])
      return next
    })
  }, [])

  const handleNameChange = useCallback((index: number, name: string) => {
    setPlaces((prev) => {
      const reviewed = prev[index]
      if (!reviewed) return prev
      const next = [...prev]
      next[index] = setPlaceOverrides(reviewed, { name })
      return next
    })
  }, [])

  const handleNameReset = useCallback((index: number) => {
    setPlaces((prev) => {
      const reviewed = prev[index]
      if (!reviewed) return prev
      const next = [...prev]
      next[index] = clearPlaceOverrides(reviewed, ["name"])
      return next
    })
  }, [])

  const handleShootEnvironmentChange = useCallback(
    (index: number, shoot_environment: PlaceShootEnvironment | null) => {
      setPlaces((prev) => {
        const reviewed = prev[index]
        if (!reviewed) return prev
        const next = [...prev]
        next[index] = setPlaceOverrides(reviewed, { shoot_environment })
        return next
      })
    },
    [],
  )

  const handleShootEnvironmentReset = useCallback((index: number) => {
    setPlaces((prev) => {
      const reviewed = prev[index]
      if (!reviewed) return prev
      const next = [...prev]
      next[index] = clearPlaceOverrides(reviewed, ["shoot_environment"])
      return next
    })
  }, [])

  const handleReviewNoteChange = useCallback((index: number, note: string) => {
    setPlaces((prev) => {
      const reviewed = prev[index]
      if (!reviewed) return prev
      const next = [...prev]
      next[index] = {
        ...reviewed,
        review_note: note.length > 0 ? note : undefined,
      }
      return next
    })
  }, [])

  const handleFinish = useCallback(async () => {
    if (!fictionId) {
      setSaveError(t("assignFictionRequiredBeforeFinish"))
      return
    }
    if (approvedCount === 0 && !hunterNote.trim()) {
      setSaveError(t("huntNoteRequiredError"))
      return
    }
    setSaving(true)
    setSaveError(null)
    const res = await finishHuntReviewAction({
      huntId: hunt.id,
      places,
      hunterNote: hunterNote.trim() || null,
    })
    setSaving(false)
    if (!res.success) {
      setSaveError(res.error)
      return
    }
    setPlaces(res.data.payload.places)
    router.refresh()
  }, [approvedCount, fictionId, hunt.id, hunterNote, places, router, t])

  const handleFictionAssigned = useCallback(
    (data: { fictionId: string; fictionTitle: string; places: HuntPlaceReviewed[] }) => {
      setFictionId(data.fictionId)
      setFictionTitle(data.fictionTitle)
      setPlaces(data.places)
      setSaveError(null)
      skipNextDraftSaveRef.current = true
      router.refresh()
    },
    [router],
  )

  const getPostulateHref = useCallback(
    (index: number) => {
      const reviewed = places[index]
      if (!reviewed || !canPostulateCandidate(reviewed)) return null
      return `/contribute/place?huntId=${hunt.id}&placeIndex=${index}`
    },
    [hunt.id, places],
  )

  const needsFiction = canEdit && !fictionId

  if (total === 0) {
    return (
      <FictionContributeLayout leftAside={null} rightAside={null}>
        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center px-4 text-center">
          <p className="text-sm text-muted-foreground">No places were extracted from this source.</p>
          <button
            type="button"
            onClick={() => router.push("/contribute/hunt")}
            className="mt-6 text-sm text-primary hover:underline"
          >
            Back to Hunt
          </button>
        </div>
      </FictionContributeLayout>
    )
  }

  const activeReviewed = places[activeIndex]
  if (!activeReviewed) return null

  const activePlace = effectivePlace(activeReviewed)
  const activeCoords = getCoords(activeReviewed)
  const activeReviewStatus = isInboxMode
    ? candidateToStatus(activeReviewed)
    : decisionToStatus(activeReviewed.review_decision)
  const activePostulateHref = getPostulateHref(activeIndex)

  const leftAside = (
    <HuntPlacesAside
      places={places}
      activeIndex={activeIndex}
      reviewState={reviewStateForAside}
      coordsAdjusted={isCoordsAdjustedForIndex}
      fictionTitle={fictionTitle}
      hunterNote={hunterNote}
      onHunterNoteChange={canEdit ? setHunterNote : undefined}
      canEdit={canEdit}
      inboxMode={isInboxMode}
      getPostulateHref={isInboxMode ? getPostulateHref : undefined}
      onSelect={setActiveIndex}
      onToggleApprove={canEdit ? toggleApprove : undefined}
      onFinish={canEdit && fictionId ? () => void handleFinish() : undefined}
      className="min-[900px]:pl-1 max-h-full py-1"
    />
  )

  const rightAside = (
    <HuntReviewCriteriaAside
      sourceUrl={sourceUrl}
      reviewed={activeReviewed}
      coords={activeCoords}
      reviewStatus={activeReviewStatus}
      onToggleApprove={handleToggleApprove}
      reviewNote={activeReviewed.review_note ?? ""}
      onReviewNoteChange={
        canEdit ? (note) => handleReviewNoteChange(activeIndex, note) : undefined
      }
      canEdit={canEdit}
      postulateHref={isInboxMode ? activePostulateHref : null}
      className="py-1"
    />
  )

  return (
    <FictionContributeLayout leftAside={leftAside} rightAside={rightAside} mainColumnScroll={false}>
      <ContributionWizardShell
        scrollRef={scrollRef}
        stepIndex={activeIndex}
        totalSteps={total}
        contentMaxWidthClassName="max-w-[920px]"
        footerNav={{
          showBack: true,
          onBack: activeIndex === 0 ? () => router.back() : goPrev,
          backLabel: activeIndex === 0 ? t("backToHunt") : t("previousLocation"),
          isLastStep: false,
          onNext: goNext,
          onSubmit: () => void handleFinish(),
          nextLabel: t("nextLocation"),
          submitLabel: saving ? t("closingReview") : t("closeReviewAction"),
          disabled: isInboxMode ? false : saving || !fictionId || !canEdit,
          showTrailingArrow: !isLastPlace,
        }}
      >
        {needsFiction && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{t("assignFictionBannerTitle")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("assignFictionBannerBody")}</p>
            </div>
            <Button type="button" size="sm" className="shrink-0" onClick={() => setAssignOpen(true)}>
              {t("assignFictionAction")}
            </Button>
          </div>
        )}

        {isInboxMode && (
          <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-sm font-medium text-foreground">{t("inboxBannerTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("inboxBannerBody")}</p>
          </div>
        )}

        {isInboxMode && activePostulateHref && (
          <div className="min-[900px]:hidden mt-4 space-y-1.5 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <Button asChild size="sm" className="w-full">
              <Link href={activePostulateHref}>{t("postulateAction")}</Link>
            </Button>
            <p className="text-[10px] text-muted-foreground">{t("postulateHint")}</p>
          </div>
        )}

        <HuntAssignFictionDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          sourceId={sourceId}
          huntId={hunt.id}
          fictions={fictions}
          contextLabel={contextLabel}
          onAssigned={handleFictionAssigned}
        />

        <HuntPlacesMobileStrip
          places={places}
          activeIndex={activeIndex}
          reviewState={reviewStateForAside}
          fictionTitle={fictionTitle}
          inboxMode={isInboxMode}
          onSelect={setActiveIndex}
          className="pt-4"
        />

        {draftStatus !== "idle" && (
          <p className="text-xs text-muted-foreground">
            {draftStatus === "saving" && t("draftSaving")}
            {draftStatus === "saved" && t("draftSaved")}
            {draftStatus === "error" && t("draftError")}
          </p>
        )}

        {canEdit && (
          <div className="min-[900px]:hidden mt-4 space-y-4 border-t border-border/40 pt-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">{t("placeNoteLabel")}</p>
              <textarea
                value={activeReviewed.review_note ?? ""}
                onChange={(e) => handleReviewNoteChange(activeIndex, e.target.value)}
                placeholder={t("placeNotePlaceholder")}
                rows={2}
                maxLength={500}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">{t("huntNoteLabel")}</p>
              <textarea
                value={hunterNote}
                onChange={(e) => setHunterNote(e.target.value)}
                placeholder={t("huntNotePlaceholder")}
                rows={2}
                maxLength={1000}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              <p className="text-[10px] text-muted-foreground">
                {approvedCount === 0 ? t("huntNoteRequiredHint") : t("huntNoteHint")}
              </p>
            </div>
          </div>
        )}

        <HuntPlaceReviewDetail
          key={activeIndex}
          place={activePlace}
          index={activeIndex}
          totalPlaces={total}
          coords={activeCoords}
          coordsAdjusted={isCoordsAdjustedForIndex(activeIndex)}
          addressAdjusted={isAddressAdjustedForIndex(activeIndex)}
          nameAdjusted={isNameAdjustedForIndex(activeIndex)}
          savedReference={effectiveStreetViewReference(activeReviewed)}
          onCoordsChange={(coords, cameraReference) =>
            handleCoordsChange(activeIndex, coords, cameraReference)
          }
          onCoordsReset={() => handleCoordsReset(activeIndex)}
          onAddressChange={(address) => handleAddressChange(activeIndex, address)}
          onAddressReset={() => handleAddressReset(activeIndex)}
          onFullAddressChange={(data) => handleFullAddressChange(activeIndex, data)}
          onReferenceChange={(reference) => handleReferenceChange(activeIndex, reference)}
          onNameChange={(name) => handleNameChange(activeIndex, name)}
          onNameReset={() => handleNameReset(activeIndex)}
          shootEnvironment={activePlace.shoot_environment ?? null}
          shootEnvironmentAdjusted={isShootEnvironmentAdjustedForIndex(activeIndex)}
          onShootEnvironmentChange={
            canEdit
              ? (value) => handleShootEnvironmentChange(activeIndex, value)
              : undefined
          }
          onShootEnvironmentReset={
            canEdit ? () => handleShootEnvironmentReset(activeIndex) : undefined
          }
        />

        <div className="min-[900px]:hidden border-t border-border/40 pt-3 mt-6">
          {canEdit && (
          <button
            type="button"
            onClick={handleToggleApprove}
            aria-pressed={activeReviewStatus === "approved"}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs transition-colors",
              activeReviewStatus === "approved"
                ? "font-medium text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-sm border-2 transition-colors",
                activeReviewStatus === "approved"
                  ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                  : "border-border bg-background",
              )}
              aria-hidden
            >
              {activeReviewStatus === "approved" ? (
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              ) : null}
            </span>
            {t("approveAction")}
          </button>
          )}
        </div>

        {saveError && (
          <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {saveError}
          </p>
        )}

        <div className="min-[900px]:hidden mt-6 border-t border-border/40 pt-4">
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => void handleFinish()}
            disabled={saving}
          >
            {saving ? "Saving…" : approvedCount === 0 ? "Finish review" : `Finish review (${approvedCount})`}
          </Button>
        </div>
      </ContributionWizardShell>
    </FictionContributeLayout>
  )
}
