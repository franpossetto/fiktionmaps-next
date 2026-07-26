"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"
import type { TopContributorProfile } from "@/src/contributions/domain/contribution.entity"

interface ContributorsPageProps {
  contributors: TopContributorProfile[]
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
}

function displayName(contributor: TopContributorProfile, fallback: string): string {
  return contributor.username?.trim() || contributor.fullName?.trim() || fallback
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-sm font-bold text-amber-600 dark:text-amber-400">
        1
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-300/30 text-sm font-bold text-zinc-500 dark:text-zinc-400">
        2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-400/15 text-sm font-bold text-orange-600 dark:text-orange-400">
        3
      </span>
    )
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center text-sm tabular-nums text-muted-foreground/50">
      {rank}
    </span>
  )
}

export function ContributorsPage({ contributors, page, totalPages, totalCount, pageSize }: ContributorsPageProps) {
  const t = useTranslations("Contributors")
  const fallback = t("memberFallback")

  const globalOffset = (page - 1) * pageSize
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <main className="px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[920px]">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("pageTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pageSubtitle")}
              {totalCount > 0 && (
                <span className="ml-1.5 tabular-nums text-muted-foreground/60">· {totalCount.toLocaleString()}</span>
              )}
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0 gap-1.5">
            <Link href="/profile/contribute">
              <Plus className="h-4 w-4" aria-hidden />
              {t("addContribution")}
            </Link>
          </Button>
        </div>

        {contributors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
        ) : (
          <>
            <ul className="space-y-1">
              {contributors.map((contributor, index) => {
                const rank = globalOffset + index + 1
                const name = displayName(contributor, fallback)
                const initial = name.charAt(0).toUpperCase()
                return (
                  <li
                    key={contributor.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <RankBadge rank={rank} />
                    <UserAvatar avatarId={contributor.avatarUrl} fallback={initial} className="h-9 w-9 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{contributor.fppTotal.toLocaleString()}</span>
                      {" "}
                      <span className="text-xs uppercase tracking-wide">{t("fppLabel")}</span>
                    </span>
                  </li>
                )
              })}
            </ul>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between gap-4">
                {hasPrev ? (
                  <Link
                    href={{ pathname: "/contributors", query: { page: page - 1 } }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    {t("prevPage")}
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-sm tabular-nums text-muted-foreground">
                  {page} / {totalPages}
                </span>
                {hasNext ? (
                  <Link
                    href={{ pathname: "/contributors", query: { page: page + 1 } }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {t("nextPage")}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
