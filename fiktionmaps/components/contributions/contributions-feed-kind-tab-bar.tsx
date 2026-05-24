"use client"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import {
  buildContributionsFeedHref,
  type ContributionsFeedTab,
} from "@/components/contributions/contributions-feed-href"
import type { StaffContributionsFeedKind } from "@/src/contributions/domain/contribution.entity"

export interface ContributionsFeedKindTabBarProps {
  activeKind: StaffContributionsFeedKind
  statusTab: ContributionsFeedTab
  submitter: string
  navAriaLabel: string
  labelFiction: string
  labelPlace: string
  labelAll: string
}

export function ContributionsFeedKindTabBar({
  activeKind,
  statusTab,
  submitter,
  navAriaLabel,
  labelFiction,
  labelPlace,
  labelAll,
}: ContributionsFeedKindTabBarProps) {
  const kinds: { value: StaffContributionsFeedKind; label: string }[] = [
    { value: "fiction", label: labelFiction },
    { value: "place", label: labelPlace },
    { value: "all", label: labelAll },
  ]

  return (
    <nav className="mb-4" aria-label={navAriaLabel}>
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
        {kinds.map(({ value, label }) => {
          const href = buildContributionsFeedHref(statusTab, submitter, undefined, value)
          const isActive = activeKind === value
          return (
            <Link
              key={value}
              href={href}
              prefetch
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
