"use client"

import { useEffect, useMemo, useState } from "react"
import { Crown } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserAvatar } from "@/components/ui/user-avatar"
import type {
  ContributorEntityScopeCounts,
  FictionScopeContributorContributionItem,
  TopContributorsModalContext,
} from "@/src/contributions/domain/contribution.entity"
import type { ContributorRanked } from "@/components/contributions/top-contributors-list"
import { getFictionScopeContributorContributionsAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import { getFictionContributorActionFromItem } from "@/lib/contributions/fiction-contributor-role-label"
import { cn } from "@/lib/utils"

type FictionContributorContributionsDialogProps = {
  contributor: ContributorRanked | null
  modalContext: Extract<TopContributorsModalContext, { type: "fiction" }>
  nameFallback: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function displayContributorIdentity(
  contributor: ContributorRanked,
  nameFallback: string,
): { title: string; handle: string | null; initial: string } {
  const username = contributor.username?.trim() || null
  const fullName = contributor.fullName?.trim() || null

  if (fullName) {
    return {
      title: fullName,
      handle: username ? `@${username}` : null,
      initial: fullName.charAt(0).toUpperCase(),
    }
  }

  if (username) {
    return {
      title: username,
      handle: null,
      initial: username.charAt(0).toUpperCase(),
    }
  }

  return {
    title: nameFallback,
    handle: null,
    initial: nameFallback.charAt(0).toUpperCase(),
  }
}

function getScopeSummaryKey(
  scopeCounts: ContributorEntityScopeCounts,
):
  | "contributorModalScopeSummary_both"
  | "contributorModalScopeSummary_fictionsOnly"
  | "contributorModalScopeSummary_placesOnly"
  | null {
  const { fictionCount, placeCount } = scopeCounts
  if (fictionCount > 0 && placeCount > 0) return "contributorModalScopeSummary_both"
  if (fictionCount > 0) return "contributorModalScopeSummary_fictionsOnly"
  if (placeCount > 0) return "contributorModalScopeSummary_placesOnly"
  return null
}

function DescriptionSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <div className="h-3.5 w-full max-w-[85%] animate-pulse rounded bg-muted/70" />
      <div className="h-3.5 w-2/3 max-w-xs animate-pulse rounded bg-muted/50" />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <ol className="divide-y divide-border/40" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index} className="py-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="h-4 w-full max-w-xs animate-pulse rounded bg-muted" />
            <div className="h-5 w-12 shrink-0 animate-pulse rounded-full bg-muted/70" />
          </div>
        </li>
      ))}
    </ol>
  )
}

function ContributionRow({
  item,
  dateLabel,
  fppLabel,
}: {
  item: FictionScopeContributorContributionItem
  dateLabel: string
  fppLabel: string
}) {
  const t = useTranslations("Fictions")
  const action = getFictionContributorActionFromItem(item)
  const params = {
    place: action.params.place || (item.entityType === "scene" ? t("contributorModalFallbackScene") : t("contributorModalFallbackPlace")),
  }
  const showCrown = item.type === "create_fiction" && item.entityType === "fiction"

  return (
    <li className="py-3.5">
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
          <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span>
              {t.rich(action.key, {
                ...params,
                placeEm: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              })}
            </span>
            {showCrown ? (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400"
                title={t("contributorModalFounderBadge")}
              >
                <Crown className="h-3 w-3 shrink-0" aria-hidden />
                {t("contributorModalFounderBadge")}
              </span>
            ) : null}
            <span className="text-muted-foreground/70" aria-hidden>
              ·
            </span>
            <time dateTime={item.createdAt} className="text-xs text-muted-foreground">
              {dateLabel}
            </time>
          </span>
        </p>
        <span className="shrink-0 rounded-full bg-muted/70 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {fppLabel}
        </span>
      </div>
    </li>
  )
}

export function FictionContributorContributionsDialog({
  contributor,
  modalContext,
  nameFallback,
  open,
  onOpenChange,
}: FictionContributorContributionsDialogProps) {
  const t = useTranslations("Fictions")
  const locale = useLocale()
  const [items, setItems] = useState<FictionScopeContributorContributionItem[] | null>(null)
  const [scopeCounts, setScopeCounts] = useState<ContributorEntityScopeCounts | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale === "es" ? "es" : "en-US", { dateStyle: "medium" }),
    [locale],
  )

  useEffect(() => {
    if (!open || !contributor) {
      setItems(null)
      setScopeCounts(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setItems(null)
    setScopeCounts(null)

    void getFictionScopeContributorContributionsAction(modalContext.fictionId, contributor.id).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.success) {
        setError(result.error)
        return
      }
      setItems(result.items)
      setScopeCounts(result.scopeCounts)
    })

    return () => {
      cancelled = true
    }
  }, [open, contributor, modalContext.fictionId])

  if (!contributor) return null

  const { title, handle, initial } = displayContributorIdentity(contributor, nameFallback)
  const contributionCount = items?.length ?? 0
  const scopeSummaryKey = scopeCounts ? getScopeSummaryKey(scopeCounts) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden border-border/70 p-0 shadow-xl sm:rounded-2xl",
          "max-h-[min(85dvh,680px)] translate-x-[-50%] translate-y-[-50%]",
          "[&>button]:right-4 [&>button]:top-4 [&>button]:flex [&>button]:h-8 [&>button]:w-8 [&>button]:items-center [&>button]:justify-center",
          "[&>button]:rounded-full [&>button]:border [&>button]:border-border/70 [&>button]:bg-background [&>button]:opacity-100",
          "[&>button]:shadow-sm [&>button]:hover:bg-muted",
        )}
      >
        <div className="shrink-0 border-b border-border/50 px-6 pb-5 pt-6 pr-14">
          <div className="flex items-start gap-4">
            <UserAvatar
              avatarId={contributor.avatarUrl}
              fallback={initial}
              className="h-14 w-14 shrink-0 rounded-2xl border-2 border-border bg-muted"
            />

            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-left text-xl font-bold leading-tight tracking-tight">
                {title}
              </DialogTitle>
              {handle ? (
                <DialogDescription className="mt-1 truncate text-left text-sm text-muted-foreground">
                  {handle}
                </DialogDescription>
              ) : null}
            </div>
          </div>

          {loading || scopeSummaryKey ? (
            <div className="mt-4">
              {loading ? (
                <DescriptionSkeleton />
              ) : scopeSummaryKey && scopeCounts ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(scopeSummaryKey, {
                    fictionCount: scopeCounts.fictionCount,
                    placeCount: scopeCounts.placeCount,
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 px-6 pb-3.5 pt-5 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t("contributorModalContributionsHeadingPrefix")}
              </p>
              <p className="text-sm font-semibold text-foreground">{modalContext.fictionTitle}</p>
              {!loading && contributionCount > 0 ? (
                <span className="text-xs text-muted-foreground">
                  · {t("contributorModalContributionCount", { count: contributionCount })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="px-6 pb-6 pt-3">
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : items && items.length > 0 ? (
              <ol className="divide-y divide-border/40">
                {items.map((item) => (
                  <ContributionRow
                    key={item.id}
                    item={item}
                    dateLabel={dateFormatter.format(new Date(item.createdAt))}
                    fppLabel={t("contributorModalFppAwarded", { count: item.fppAwarded })}
                  />
                ))}
              </ol>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center text-sm leading-relaxed text-muted-foreground">
                {t("contributorModalEmpty")}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
