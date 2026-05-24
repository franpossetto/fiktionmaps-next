"use client"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import {
  buildContributionsFeedHref,
  type ContributionsFeedTab,
} from "@/components/contributions/contributions-feed-href"

export type { ContributionsFeedTab }

function buildContributionsHref(tab: ContributionsFeedTab, submitter: string): string {
  return buildContributionsFeedHref(tab, submitter)
}

export interface ContributionsFeedTabBarProps {
  active: ContributionsFeedTab
  submitter: string
  navAriaLabel: string
  labelAll: string
  labelPending: string
  labelApproved: string
}

export function ContributionsFeedTabBar({
  active,
  submitter,
  navAriaLabel,
  labelAll,
  labelPending,
  labelApproved,
}: ContributionsFeedTabBarProps) {
  const tabs: { value: ContributionsFeedTab; label: string }[] = [
    { value: "all", label: labelAll },
    { value: "pending", label: labelPending },
    { value: "approved", label: labelApproved },
  ]

  return (
    <nav className="mb-6 border-b border-border" aria-label={navAriaLabel}>
      <div className="flex flex-wrap gap-x-5 gap-y-1 sm:gap-x-8">
        {tabs.map(({ value, label }) => {
          const href = buildContributionsHref(value, submitter)
          const isActive = active === value
          return (
            <Link
              key={value}
              href={href}
              prefetch
              className={cn(
                "-mb-px inline-flex border-b-2 pb-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
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
