"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import type { HuntResult, HuntPlace } from "@/src/hunts/domain/hunt.types"
import type { LatLng } from "@/lib/map/types"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import { HUNT_RESULT_SESSION_KEY } from "./hunt-form"
import {
  HuntPlacesAside,
  HuntPlacesMobileStrip,
  type HuntReviewStatus,
} from "./hunt-places-aside"
import { HuntReviewCriteriaAside } from "./hunt-review-criteria-aside"
import { HuntPlaceReviewDetail } from "./hunt-place-review-detail"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

function coordsEqual(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6
}

export function HuntConfirmPage() {
  const router = useRouter()
  const [result, setResult] = useState<HuntResult | null>(null)
  const [fictionTitle, setFictionTitle] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [reviewState, setReviewState] = useState<Record<number, HuntReviewStatus>>({})
  const [adjustments, setAdjustments] = useState<Record<number, LatLng>>({})
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HUNT_RESULT_SESSION_KEY)
      if (!raw) {
        router.replace("/contribute/hunt")
        return
      }
      const parsed = JSON.parse(raw) as { result: HuntResult; fictionTitle: string }
      setResult(parsed.result)
      setFictionTitle(parsed.fictionTitle)
    } catch {
      router.replace("/contribute/hunt")
    }
  }, [router])

  const places = result?.places ?? []
  const total = places.length
  const isLastPlace = activeIndex >= total - 1

  const getCoords = useCallback(
    (index: number, place: HuntPlace): LatLng | null => {
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
    () => places.filter((_, i) => reviewState[i] === "approved").length,
    [places, reviewState],
  )

  const setReview = useCallback((index: number, status: HuntReviewStatus) => {
    setReviewState((prev) => ({ ...prev, [index]: status }))
  }, [])

  const goNext = useCallback(() => {
    setActiveIndex((i) => Math.min(i + 1, total - 1))
  }, [total])

  const goPrev = useCallback(() => {
    setActiveIndex((i) => Math.max(i - 1, 0))
  }, [])

  const handleToggleApprove = useCallback(() => {
    const current = reviewState[activeIndex] ?? "pending"
    if (current === "approved") {
      setReviewState((prev) => {
        const next = { ...prev }
        delete next[activeIndex]
        return next
      })
      return
    }
    setReview(activeIndex, "approved")
    if (!isLastPlace) goNext()
  }, [activeIndex, goNext, isLastPlace, reviewState, setReview])

  const handleToggleApproveForIndex = useCallback((index: number) => {
    setReviewState((prev) => {
      if (prev[index] === "approved") {
        const next = { ...prev }
        delete next[index]
        return next
      }
      return { ...prev, [index]: "approved" }
    })
  }, [])

  const handleCoordsReset = useCallback(() => {
    setAdjustments((prev) => {
      const next = { ...prev }
      delete next[activeIndex]
      return next
    })
  }, [activeIndex])

  const handleFinish = useCallback(() => {
    setFinished(true)
  }, [])

  if (!result) {
    return (
      <FictionContributeLayout leftAside={null} rightAside={null}>
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </FictionContributeLayout>
    )
  }

  if (finished) {
    return (
      <FictionContributeLayout leftAside={null} rightAside={null}>
        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center px-4 text-center">
          <h1 className="text-xl font-bold text-foreground">Review complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {approvedCount} location{approvedCount !== 1 ? "s" : ""} approved for{" "}
            <span className="font-medium text-foreground">{fictionTitle}</span>.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Persistence is not enabled yet — approved locations are ready for the next phase.
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

  const activePlace = places[activeIndex]
  if (!activePlace) {
    router.replace("/contribute/hunt")
    return null
  }

  const activeCoords = getCoords(activeIndex, activePlace)
  const activeReviewStatus = reviewState[activeIndex] ?? "pending"

  const leftAside = (
    <HuntPlacesAside
      places={places}
      activeIndex={activeIndex}
      reviewState={reviewState}
      coordsAdjusted={isCoordsAdjustedForIndex}
      fictionTitle={fictionTitle}
      onSelect={setActiveIndex}
      onToggleApprove={handleToggleApproveForIndex}
      onFinish={handleFinish}
      className="min-[900px]:pl-1 max-h-full py-1"
    />
  )

  const rightAside = (
    <HuntReviewCriteriaAside
      sourceUrl={result.source_url}
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
        stepIndex={activeIndex}
        totalSteps={total}
        contentMaxWidthClassName="max-w-[920px]"
        footerNav={{
          showBack: true,
          onBack: activeIndex === 0 ? () => router.back() : goPrev,
          backLabel: activeIndex === 0 ? "Back to Hunt" : "Previous location",
          isLastStep: false,
          onNext: goNext,
          onSubmit: handleFinish,
          nextLabel: "Next location",
          submitLabel: "Finish review",
          disabled: false,
          showTrailingArrow: !isLastPlace,
        }}
      >
        <HuntPlacesMobileStrip
          places={places}
          activeIndex={activeIndex}
          reviewState={reviewState}
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
          onCoordsChange={(coords) => setAdjustments((prev) => ({ ...prev, [activeIndex]: coords }))}
          onCoordsReset={handleCoordsReset}
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

        <div className="min-[900px]:hidden mt-6 border-t border-border/40 pt-4">
          <Button type="button" size="sm" className="w-full" onClick={handleFinish}>
            {approvedCount === 0 ? "Finish review" : `Finish review (${approvedCount})`}
          </Button>
        </div>
      </ContributionWizardShell>
    </FictionContributeLayout>
  )
}
