"use client"

import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import type { ContributorProfileWithDate } from "@/src/contributions/domain/contribution.entity"
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
  const avatarUrl = primary.avatarUrl?.trim()

  return (
    <div className={cn("flex min-w-0 flex-nowrap items-center gap-2.5", className)}>
      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/40">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={24} height={24} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-muted-foreground">
            {initial}
          </span>
        )}
      </div>
      <p className="min-w-0 text-xs leading-snug sm:text-[13px]">
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
