"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { ContributePublicPreviewAside } from "@/components/contribute/contribute-public-preview-aside"
import { PlaceContributeReferencePhotoAside } from "@/components/contribute/place/place-contribute-reference-photo-aside"
import type { PlaceContributeFormStep } from "./place-contribute-steps-aside"
import { PlaceContributeFppRewardCard } from "./place-contribute-fpp-reward-card"

export function PlaceContributeCriteriaAside({
  step,
  photoPreviewUrl,
  className,
}: {
  step: PlaceContributeFormStep
  /** Step 6: uploaded place photo shown in the layout right rail. */
  photoPreviewUrl?: string | null
  className?: string
}) {
  const t = useTranslations("Contribute.place")
  const tc = useTranslations("Contribute.criteria")

  if (step === 8) {
    return (
      <ContributePublicPreviewAside
        className={className}
        title={tc("publicPreviewTitle")}
        description={tc("publicPreviewDescriptionPlace")}
        reviewPendingNote={tc("reviewPending")}
        rewardCard={<PlaceContributeFppRewardCard />}
      />
    )
  }

  const bullets: string[] = (() => {
    switch (step) {
      case 1:
        return [t("criteriaFiction1")]
      case 2:
        return [t("criteriaLocation1"), t("criteriaLocation2")]
      case 3:
        return [t("criteriaDetails1")]
      case 4:
        return [t("criteriaDetails1")]
      case 5:
        return [t("criteriaPhoto1"), t("criteriaPhoto2")]
      case 6:
        return [t("criteriaStreetView1"), t("criteriaStreetView2")]
      case 7:
        return [t("criteriaDescription1")]
      default:
        return []
    }
  })()

  return (
    <aside className={cn("w-full min-w-0 space-y-6", className)}>
      {step === 6 ? <PlaceContributeReferencePhotoAside previewUrl={photoPreviewUrl ?? null} /> : null}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tc("heading")}</p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          {bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
