"use client"

import { useMemo, useState } from "react"
import { ExternalLink, Plus } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import type { HuntWorkQueueItem } from "@/src/hunts/domain/hunt-work-queue.types"
import type { HuntStatus } from "@/src/hunts/domain/hunt.entity"
import type { HuntScrapeStatus } from "@/src/hunts/domain/hunt-source.entity"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FILTER_ALL = "all"

const FILTER_SELECT =
  "h-9 min-w-[10rem] rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function HuntStatusBadge({ status }: { status: HuntStatus }) {
  const t = useTranslations("Contribute.huntWork")
  const map: Record<HuntStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    in_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  }
  const labels: Record<HuntStatus, string> = {
    draft: "Draft",
    in_review: "In review",
    submitted: t("statusReady"),
    approved: "Approved",
    rejected: "Rejected",
  }
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", map[status])}>
      {labels[status]}
    </span>
  )
}

function ScrapeStatusDot({ status }: { status: HuntScrapeStatus }) {
  const color =
    status === "ok"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-red-500"
        : "bg-amber-400"
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", color)} title={status} />
}

function EmptyCell() {
  return <span className="text-muted-foreground/50">—</span>
}

type HuntWorkQueueProps = {
  items: HuntWorkQueueItem[]
}

export function HuntWorkQueue({ items }: HuntWorkQueueProps) {
  const t = useTranslations("Contribute.huntWork")
  const [fictionFilter, setFictionFilter] = useState(FILTER_ALL)
  const [labelFilter, setLabelFilter] = useState(FILTER_ALL)

  const fictionOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of items) {
      if (item.fictionId && item.fictionTitle) {
        map.set(item.fictionId, item.fictionTitle)
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const labelOptions = useMemo(() => {
    const labels = new Set<string>()
    for (const item of items) {
      if (item.contextLabel?.trim()) labels.add(item.contextLabel.trim())
    }
    return [...labels].sort((a, b) => a.localeCompare(b))
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (fictionFilter !== FILTER_ALL && item.fictionId !== fictionFilter) return false
      if (labelFilter !== FILTER_ALL && item.contextLabel?.trim() !== labelFilter) return false
      return true
    })
  }, [fictionFilter, items, labelFilter])

  const hasActiveFilters = fictionFilter !== FILTER_ALL || labelFilter !== FILTER_ALL

  function clearFilters() {
    setFictionFilter(FILTER_ALL)
    setLabelFilter(FILTER_ALL)
  }

  const showFilters = fictionOptions.length > 0 || labelOptions.length > 0

  return (
    <FictionContributeLayout leftAside={null} rightAside={null}>
      <div className="w-full min-w-0 px-4 pb-10 sm:px-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("kicker")}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("title")}</h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">{t("subtitle")}</p>
          </div>
          <Button asChild size="sm" className="shrink-0 gap-1.5">
            <Link href="/contribute/hunt/new">
              <Plus className="h-4 w-4" />
              {t("newHunt")}
            </Link>
          </Button>
        </header>

        {items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
            <Button asChild size="sm" className="mt-4 gap-1.5">
              <Link href="/contribute/hunt/new">
                <Plus className="h-4 w-4" />
                {t("newHunt")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {showFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {fictionOptions.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{t("filterFiction")}</span>
                    <select
                      value={fictionFilter}
                      onChange={(e) => setFictionFilter(e.target.value)}
                      className={FILTER_SELECT}
                      aria-label={t("filterFiction")}
                    >
                      <option value={FILTER_ALL}>{t("filterAll")}</option>
                      {fictionOptions.map(([id, title]) => (
                        <option key={id} value={id}>
                          {title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {labelOptions.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{t("filterLabel")}</span>
                    <select
                      value={labelFilter}
                      onChange={(e) => setLabelFilter(e.target.value)}
                      className={FILTER_SELECT}
                      aria-label={t("filterLabel")}
                    >
                      <option value={FILTER_ALL}>{t("filterAll")}</option>
                      {labelOptions.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {hasActiveFilters && (
                  <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={clearFilters}>
                    {t("filterClear")}
                  </Button>
                )}
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">{t("emptyFiltered")}</p>
                {hasActiveFilters && (
                  <Button type="button" variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                    {t("filterClear")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{t("colUpdated")}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{t("colFiction")}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{t("colType")}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{t("colSource")}</th>
                      <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-muted-foreground sm:table-cell">{t("colScrape")}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{t("colStatus")}</th>
                      <th className="hidden px-4 py-2.5 text-left text-xs font-medium text-muted-foreground md:table-cell">{t("colPlaces")}</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.huntId} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                          {formatRelative(item.huntUpdatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">
                            {item.fictionTitle ?? item.contextLabel ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.fictionId ? (
                            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t("typeFiction")}
                            </span>
                          ) : item.contextLabel ? (
                            <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                              {t("labelOnly")}
                            </span>
                          ) : (
                            <EmptyCell />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-[200px] items-center gap-1 text-xs text-primary hover:underline sm:max-w-[220px]"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{hostnameFromUrl(item.sourceUrl)}</span>
                          </a>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                            <ScrapeStatusDot status={item.scrapeStatus} />
                            {item.scrapeStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <HuntStatusBadge status={item.huntStatus} />
                        </td>
                        <td className="hidden px-4 py-3 text-xs tabular-nums text-muted-foreground md:table-cell">
                          {item.huntStatus === "submitted"
                            ? t("placesProgress", {
                                posted: item.posted,
                                pending: Math.max(0, item.shortlisted - item.posted),
                              })
                            : item.shortlisted > 0
                              ? t("placesApprovedOf", {
                                  approved: item.shortlisted,
                                  total: item.extracted,
                                })
                              : t("placesShortlisted", { shortlisted: item.extracted })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/contribute/hunt/${item.huntId}/review`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {item.huntStatus === "submitted" || item.huntStatus === "approved"
                              ? t("actionOpen")
                              : t("actionReview")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </FictionContributeLayout>
  )
}
