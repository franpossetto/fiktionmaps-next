"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { CONTRIBUTION_FPP } from "@/src/contributions/domain/contribution.config"

export function FictionContributeFppRewardCard({ className }: { className?: string }) {
  const tf = useTranslations("Contribute.fiction")
  const fppIfApproved = CONTRIBUTION_FPP.create_fiction

  return (
    <div className={cn("border-t border-border/60 pt-4", className)} role="note">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {tf("publicPreviewFppCardEyebrow")}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {fppIfApproved}{" "}
        <span className="text-sm font-medium normal-case tracking-normal text-muted-foreground">FPP</span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">{tf("publicPreviewFppAsideDetail")}</p>
    </div>
  )
}

/** Franja compacta cuando el aside derecho del layout no está visible (viewport estrecho). */
export function FictionContributeFppRewardCompactStrip({ className }: { className?: string }) {
  const tf = useTranslations("Contribute.fiction")
  const fppIfApproved = CONTRIBUTION_FPP.create_fiction

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-muted/20 px-3 py-3 sm:px-4 sm:py-3.5",
        className,
      )}
      role="note"
    >
      <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {tf("publicPreviewFppIfApproved", { count: fppIfApproved })}
      </p>
    </div>
  )
}
