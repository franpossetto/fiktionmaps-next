"use client"

import { useLocale, useTranslations } from "next-intl"
import type { ContributorProfileWithDate } from "@/src/contributions/domain/contribution.entity"
import { UserAvatar } from "@/components/ui/user-avatar"
import { cn } from "@/lib/utils"

export function PlaceContributorsByline({
  contributors,
  className,
}: {
  contributors: ContributorProfileWithDate[]
  className?: string
}) {
  const t = useTranslations("Fictions")
  const locale = useLocale()
  const dateLocaleTag = locale === "es" ? "es" : "en-US"
  const formatter = new Intl.DateTimeFormat(dateLocaleTag, { dateStyle: "medium" })

  const primary = contributors[0]
  if (!primary) return null

  const username = primary.username?.trim() || t("contributorNameFallback")
  const initial = username.charAt(0).toUpperCase()
  const dateLabel = formatter.format(new Date(primary.contributedAt))

  return (
    <div className={cn("flex min-w-0 flex-nowrap items-center gap-2.5", className)}>
      <UserAvatar
        avatarId={primary.avatarUrl}
        fallback={initial}
        className="h-8 w-8 shrink-0 ring-1 ring-border/40"
      />
      <p className="min-w-0 text-sm leading-snug">
        <span className="font-medium text-foreground">{username}</span>
        <span className="text-muted-foreground"> {t("placeDetailCreatedPlaceVerbPhrase")}</span>
        <span className="text-muted-foreground/70"> · </span>
        <time className="text-muted-foreground tabular-nums" dateTime={primary.contributedAt}>
          {dateLabel}
        </time>
      </p>
    </div>
  )
}
