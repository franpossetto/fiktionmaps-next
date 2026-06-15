"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"
import type { HuntPlaceReviewed, HuntReviewDecision } from "@/src/hunts/domain/hunt.types"
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
import { finishHuntReviewAction } from "@/src/hunts/infrastructure/next/hunt.actions"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

function coordsEqual(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6
}

function decisionToStatus(decision?: HuntReviewDecision): HuntReviewStatus {
  return decision === "approved" ? "approved" : "pending"
}

type HuntReviewPageProps = {
  hunt: Hunt
  fictionTitle: string
  sourceUrl: string
}

export function HuntReviewPage({ hunt, fictionTitle, sourceUrl }: HuntReviewPageProps) {
  const router = useRouter()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [places, setPlaces] = useState<HuntPlaceReviewed[]>(hunt.payload.places)
  const [activeIndex, setActiveIndex] = useState(0)
  const [adjustments, setAdjustments] = useState<Record<number, LatLng>>({})
  const [panoIds, setPanoIds] = useState<Record<number, string>>({})
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hunterNote, setHunterNote] = useState("")

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activeIndex])

  const total = places.length
  const isLastPlace = activeIndex >= total - 1

  const reviewStateForAside = useMemo(() => {
    const map: Record<number, HuntReviewStatus> = {}
    places.forEach((p, i) => {
      map[i] = decisionToStatus(p.review_decision)
    })
    return map
  }, [places])

  const getCoords = useCallback(
    (index: number, place: HuntPlaceReviewed): LatLng | null => {
      if (adjustments[index]) return adjustments[index]
      if (place.lat != null && place.lng != null) return { lat: place.lat, lng: place.lng }
      return null
    },
    [adjustments],
  )

  const isCoordsAdjustedForIndex = useCallback(
    (index: number): boolean => {
      const place = places[index]
      if (!place) return false
      const adjusted = adjustments[index]
      if (!adjusted || place.lat == null || place.lng == null) return false
      return !coordsEqual(adjusted, { lat: place.lat, lng: place.lng })
    },
    [adjustments, places],
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

  const handlePanoResolved = useCallback(
    (index: number, panoId: string) => {
      setPanoIds((prev) => (prev[index] === panoId ? prev : { ...prev, [index]: panoId }))
      setPlaces((prev) => {
        const p = prev[index]
        if (!p || p.street_view_pano_id === panoId) return prev
        const next = [...prev]
        next[index] = { ...p, street_view_pano_id: panoId }
        return next
      })
    },
    [],
  )

  const handleCoordsReset = useCallback(() => {
    setAdjustments((prev) => {
      const next = { ...prev }
      delete next[activeIndex]
      return next
    })
  }, [activeIndex])

  const handleFinish = useCallback(async () => {
    if (approvedCount === 0 && !hunterNote.trim()) {
      setSaveError("Add a note explaining why no places were approved.")
      return
    }
    setSaving(true)
    setSaveError(null)
    // Apply coord adjustments to places
    const finalPlaces = places.map((p, i) => {
      const adj = adjustments[i]
      if (!adj) return p
      return {
        ...p,
        coords_adjusted: adj,
        lat: adj.lat,
        lng: adj.lng,
      }
    })
    const res = await finishHuntReviewAction({
      huntId: hunt.id,
      places: finalPlaces,
      hunterNote: hunterNote.trim() || null,
    })
    setSaving(false)
    if (!res.success) {
      setSaveError(res.error)
      return
    }
    setFinished(true)
  }, [adjustments, approvedCount, hunt.id, hunterNote, places])

  if (finished) {
    return (
      <FictionContributeLayout leftAside={null} rightAside={null}>
        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center px-4 text-center">
          <h1 className="text-xl font-bold text-foreground">Review submitted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {approvedCount} location{approvedCount !== 1 ? "s" : ""} approved for{" "}
            <span className="font-medium text-foreground">{fictionTitle}</span>.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            A moderator will review and materialize the approved places.
          </p>
          <button
            type="button"
            onClick={() => router.push("/contribute/hunt")}
            className="mt-8 text-sm text-primary hover:underline"
          >
            Back to Hunt
          </button>
        </div>
      </FictionContributeLayout>
    )
  }

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

  const activePlace = places[activeIndex]
  if (!activePlace) return null

  const activeCoords = getCoords(activeIndex, activePlace)
  const activeReviewStatus = decisionToStatus(activePlace.review_decision)

  const leftAside = (
    <HuntPlacesAside
      places={places}
      activeIndex={activeIndex}
      reviewState={reviewStateForAside}
      coordsAdjusted={isCoordsAdjustedForIndex}
      fictionTitle={fictionTitle}
      onSelect={setActiveIndex}
      onToggleApprove={toggleApprove}
      onFinish={() => void handleFinish()}
      className="min-[900px]:pl-1 max-h-full py-1"
    />
  )

  const rightAside = (
    <HuntReviewCriteriaAside
      sourceUrl={sourceUrl}
      place={activePlace}
      coords={activeCoords}
      coordsAdjusted={isCoordsAdjustedForIndex(activeIndex)}
      reviewStatus={activeReviewStatus}
      onToggleApprove={handleToggleApprove}
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
          backLabel: activeIndex === 0 ? "Back to Hunt" : "Previous location",
          isLastStep: false,
          onNext: goNext,
          onSubmit: () => void handleFinish(),
          nextLabel: "Next location",
          submitLabel: saving ? "Saving…" : "Finish review",
          disabled: saving,
          showTrailingArrow: !isLastPlace,
        }}
      >
        <HuntPlacesMobileStrip
          places={places}
          activeIndex={activeIndex}
          reviewState={reviewStateForAside}
          fictionTitle={fictionTitle}
          onSelect={setActiveIndex}
          className="pt-4"
        />

        <HuntPlaceReviewDetail
          key={activeIndex}
          place={activePlace}
          index={activeIndex}
          totalPlaces={total}
          coords={activeCoords}
          coordsAdjusted={isCoordsAdjustedForIndex(activeIndex)}
          savedPanoId={panoIds[activeIndex] ?? activePlace.street_view_pano_id}
          onCoordsChange={(coords) => setAdjustments((prev) => ({ ...prev, [activeIndex]: coords }))}
          onCoordsReset={handleCoordsReset}
          onPanoResolved={(panoId) => handlePanoResolved(activeIndex, panoId)}
        />

        <div className="min-[900px]:hidden border-t border-border/40 pt-3 mt-6">
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
            Approve
          </button>
        </div>

        {saveError && (
          <p className="min-[900px]:hidden mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {saveError}
          </p>
        )}

        {approvedCount === 0 && (
          <div className="min-[900px]:hidden mt-4 space-y-1.5">
            <p className="text-xs text-muted-foreground">
              No places approved — add a note before finishing.
            </p>
            <textarea
              value={hunterNote}
              onChange={(e) => setHunterNote(e.target.value)}
              placeholder="Why are no places being approved?"
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>
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
