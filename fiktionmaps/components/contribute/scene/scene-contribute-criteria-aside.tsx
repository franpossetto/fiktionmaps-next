"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { ContributePublicPreviewAside } from "@/components/contribute/contribute-public-preview-aside"
import type { SceneContributeFormStep } from "@/components/contribute/scene/scene-contribute-steps-aside"
import { SceneContributeFppRewardCard } from "@/components/contribute/scene/scene-contribute-fpp-reward-card"

export function SceneContributeCriteriaAside({
  step,
  className,
}: {
  step: SceneContributeFormStep
  className?: string
}) {
  const t = useTranslations("Contribute.scene")
  const tc = useTranslations("Contribute.criteria")

  if (step === 8) {
    return (
      <ContributePublicPreviewAside
        className={className}
        title={tc("publicPreviewTitle")}
        description={tc("publicPreviewDescriptionScene")}
        reviewPendingNote={tc("reviewPending")}
        rewardCard={<SceneContributeFppRewardCard />}
      />
    )
  }

  const bullets: string[] = (() => {
    switch (step) {
      case 1:
        return [t("criteriaFiction1")]
      case 2:
        return [t("criteriaPlace1")]
      case 3:
        return [t("criteriaPlace2")]
      case 4:
        return [t("criteriaVideo1"), t("criteriaVideo2")]
      case 5:
        return [t("criteriaTitle1")]
      case 6:
        return [t("criteriaMoment1"), t("criteriaMoment2")]
      case 7:
        return [t("criteriaDescription1")]
      default:
        return []
    }
  })()

  return (
    <aside className={cn("w-full min-w-0 space-y-6", className)}>
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
