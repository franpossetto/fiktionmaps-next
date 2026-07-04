"use client"

import { TopContributorsList, type ContributorRanked } from "@/components/contributions/top-contributors-list"
import type { TopContributorsModalContext } from "@/src/contributions/domain/contribution.entity"
import { cn } from "@/lib/utils"

export type { ContributorRanked }

export type TopContributorsSectionProps = {
  contributors: ContributorRanked[]
  title: string
  emptyMessage?: string
  initialLimit?: number
  showBorderTop?: boolean
  className?: string
  nameFallback?: string
  viewMoreLabel?: string
  modalContext?: TopContributorsModalContext
}

export function TopContributorsSection({
  contributors,
  title,
  emptyMessage,
  initialLimit,
  showBorderTop,
  className,
  nameFallback,
  viewMoreLabel,
  modalContext,
}: TopContributorsSectionProps) {
  if (contributors.length === 0) {
    if (emptyMessage) {
      return <p className={cn("text-sm text-muted-foreground", className)}>{emptyMessage}</p>
    }
    return null
  }

  return (
    <section
      className={cn("space-y-2", showBorderTop && "border-t border-border/60 pt-4", className)}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{title}</p>
      <TopContributorsList
        contributors={contributors}
        nameFallback={nameFallback}
        initialLimit={initialLimit}
        viewMoreLabel={viewMoreLabel}
        modalContext={modalContext}
      />
    </section>
  )
}
