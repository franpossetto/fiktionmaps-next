"use client"

import { useState } from "react"
import type { TopContributorsModalContext } from "@/src/contributions/domain/contribution.entity"
import { FictionContributorContributionsDialog } from "@/components/fictions/fiction-contributor-contributions-dialog"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Link } from "@/i18n/navigation"
import { publicUserProfilePath } from "@/lib/users/public-profile-path"
import { cn } from "@/lib/utils"

export type ContributorRanked = {
  id: string
  username: string | null
  fullName: string | null
  avatarUrl: string | null
  fppTotal: number
}

type TopContributorsListProps = {
  contributors: ContributorRanked[]
  nameFallback?: string
  initialLimit?: number
  viewMoreLabel?: string
  modalContext?: TopContributorsModalContext
}

function displayName(contributor: ContributorRanked, nameFallback: string): string {
  return contributor.username?.trim() || contributor.fullName?.trim() || nameFallback
}

export function TopContributorsList({
  contributors,
  nameFallback = "Member",
  initialLimit,
  viewMoreLabel,
  modalContext,
}: TopContributorsListProps) {
  const [showAll, setShowAll] = useState(false)
  const [selectedContributor, setSelectedContributor] = useState<ContributorRanked | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const displayed =
    initialLimit != null && !showAll ? contributors.slice(0, initialLimit) : contributors
  const hasMore = initialLimit != null && contributors.length > initialLimit
  const isClickable = modalContext != null

  function openContributor(contributor: ContributorRanked) {
    if (!modalContext) return
    setSelectedContributor(contributor)
    setDialogOpen(true)
  }

  return (
    <>
      <ul className="space-y-2">
        {displayed.map((contributor) => {
          const label = displayName(contributor, nameFallback)
          const initial = label.charAt(0).toUpperCase()
          const profileHref = contributor.username?.trim()
            ? publicUserProfilePath(contributor.username)
            : null
          const rowContent = (
            <>
              <UserAvatar avatarId={contributor.avatarUrl} fallback={initial} className="h-8 w-8 shrink-0" />
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate font-medium text-foreground">{label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {contributor.fppTotal ?? 0} fpp
                </span>
              </div>
            </>
          )

          if (isClickable) {
            return (
              <li key={contributor.id}>
                <button
                  type="button"
                  onClick={() => openContributor(contributor)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md text-left text-sm text-muted-foreground transition-colors",
                    "hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                >
                  {rowContent}
                </button>
              </li>
            )
          }

          if (profileHref) {
            return (
              <li key={contributor.id}>
                <Link
                  href={profileHref}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md text-sm text-muted-foreground transition-colors",
                    "hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  )}
                >
                  {rowContent}
                </Link>
              </li>
            )
          }

          return (
            <li key={contributor.id} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              {rowContent}
            </li>
          )
        })}
      </ul>
      {hasMore && !showAll && viewMoreLabel ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={cn(
            "mt-3 w-full text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
          )}
        >
          {viewMoreLabel}
        </button>
      ) : null}
      {modalContext?.type === "fiction" ? (
        <FictionContributorContributionsDialog
          contributor={selectedContributor}
          modalContext={modalContext}
          nameFallback={nameFallback}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      ) : null}
    </>
  )
}
