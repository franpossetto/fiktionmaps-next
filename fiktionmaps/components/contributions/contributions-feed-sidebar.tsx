"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import type { TopContributorProfile } from "@/src/contributions/domain/contribution.entity"
import { cn } from "@/lib/utils"

const INITIAL_LIMIT = 6

interface ContributionsFeedSidebarProps {
  contributors: TopContributorProfile[]
}

export function ContributionsFeedSidebar({ contributors }: ContributionsFeedSidebarProps) {
  const t = useTranslations("Contributions")
  const [showAll, setShowAll] = useState(false)

  if (contributors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("topContributorsEmpty")}
      </p>
    )
  }

  const displayed = showAll ? contributors : contributors.slice(0, INITIAL_LIMIT)
  const hasMore = contributors.length > INITIAL_LIMIT

  return (
    <div className="space-y-3">
      <section className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground">{t("topContributorsTitle")}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{t("topContributorsSubtitle")}</p>
        <ul className="divide-y divide-border/70">
          {displayed.map((contributor) => {
            const label =
              contributor.username?.trim() || contributor.fullName?.trim() || t("contributorNameFallback")
            const initial = label.charAt(0).toUpperCase()
            return (
              <li key={contributor.id} className="flex items-center gap-2 py-2 text-xs text-muted-foreground first:pt-0">
                <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                  {contributor.avatarUrl?.trim() ? (
                    <Image
                      src={contributor.avatarUrl.trim()}
                      alt={label}
                      width={24}
                      height={24}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-muted-foreground">
                      {initial}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
                <span className="shrink-0 tabular-nums text-xs font-semibold text-foreground">
                  {contributor.fppTotal}
                  <span className="ml-0.5 font-normal text-[10px] text-muted-foreground">{t("fppLabel")}</span>
                </span>
              </li>
            )
          })}
        </ul>
        {hasMore && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={cn(
              "mt-3 w-full text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            )}
          >
            {t("viewMoreContributors")}
          </button>
        )}
      </section>
    </div>
  )
}
