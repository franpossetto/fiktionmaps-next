"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import type { TopContributorProfile } from "@/src/contributions/domain/contribution.entity"

const INITIAL_LIMIT = 5

interface TopContributorsSidebarProps {
  contributors: TopContributorProfile[]
}

export function TopContributorsSidebar({ contributors }: TopContributorsSidebarProps) {
  const t = useTranslations("Fictions")
  const [showAll, setShowAll] = useState(false)

  if (contributors.length === 0) return null

  const displayed = showAll ? contributors : contributors.slice(0, INITIAL_LIMIT)
  const hasMore = contributors.length > INITIAL_LIMIT

  return (
    <section className="mt-4 space-y-1.5">
      <h3 className="text-base font-bold tracking-tight text-foreground">{t("topContributors")}</h3>
      <ul className="space-y-1">
        {displayed.map((contributor) => {
          const label = contributor.username?.trim() || t("contributorNameFallback")
          const initial = label.charAt(0).toUpperCase()
          return (
            <li key={contributor.id} className="flex items-center gap-1.5 rounded-md px-1 py-1">
              <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
                {contributor.avatarUrl?.trim() ? (
                  <Image
                    src={contributor.avatarUrl.trim()}
                    alt={label}
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                    {initial}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{label}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{contributor.fppTotal} fpp</span>
            </li>
          )
        })}
      </ul>
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1 w-full rounded-md px-1 py-1 text-left text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("viewMore")}
        </button>
      )}
    </section>
  )
}
