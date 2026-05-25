"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { CONTRIBUTION_FPP } from "@/src/contributions/domain/contribution.config"

export function PlaceContributeFppRewardCard({ className }: { className?: string }) {
  const t = useTranslations("Contribute.place")
  const fppIfApproved = CONTRIBUTION_FPP.create_place

  return (
    <div className={cn("border-t border-border/60 pt-4", className)} role="note">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {t("publicPreviewFppCardEyebrow")}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {fppIfApproved}{" "}
        <span className="text-sm font-medium normal-case tracking-normal text-muted-foreground">FPP</span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">{t("publicPreviewFppAsideDetail")}</p>
    </div>
  )
}

export function PlaceContributeFppRewardCompactStrip({ className }: { className?: string }) {
  const t = useTranslations("Contribute.place")
  const fppIfApproved = CONTRIBUTION_FPP.create_place

  return (
    <div className={cn("rounded-lg border border-border/60 bg-muted/20 px-3 py-3 sm:px-4 sm:py-3.5", className)} role="note">
      <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {t("publicPreviewFppIfApproved", { count: fppIfApproved })}
      </p>
    </div>
  )
}
