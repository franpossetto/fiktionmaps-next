"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { ProfileContributionItem } from "@/src/contributions/domain/contribution.entity"
import { Link } from "@/i18n/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DayCell = {
  dateKey: string
  count: number
  date: Date
  inYear: boolean
  items: ProfileContributionItem[]
}

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function contributionActivityDateKey(iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return toDateKey(d)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Sunday-start week index (0 = Sunday), matching GitHub. */
function weekdaySun0(d: Date): number {
  return d.getDay()
}

function levelForCount(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted/40 dark:bg-muted/25",
  1: "bg-emerald-500/25 dark:bg-emerald-500/30",
  2: "bg-emerald-500/45 dark:bg-emerald-500/50",
  3: "bg-emerald-500/70 dark:bg-emerald-500/75",
  4: "bg-emerald-600 dark:bg-emerald-400",
}

function itemShortLabel(item: ProfileContributionItem): string {
  return item.entityLabel?.trim() || item.entityId.slice(0, 8)
}

type ProfileContributionsHeatmapProps = {
  contributions: ProfileContributionItem[]
  selectedDateKey?: string | null
  onSelectedDateKeyChange?: (dateKey: string | null) => void
  showContributeCta?: boolean
}

export function ProfileContributionsHeatmap({
  contributions,
  selectedDateKey = null,
  onSelectedDateKeyChange,
  showContributeCta = false,
}: ProfileContributionsHeatmapProps) {
  const t = useTranslations("Profile")
  const locale = useLocale()
  const [openKey, setOpenKey] = useState<string | null>(null)

  const years = useMemo(() => {
    const set = new Set<number>()
    for (const item of contributions) {
      const d = new Date(item.createdAt)
      if (!Number.isNaN(d.getTime())) set.add(d.getFullYear())
    }
    const list = [...set].sort((a, b) => b - a)
    if (list.length === 0) list.push(new Date().getFullYear())
    return list
  }, [contributions])

  const [year, setYear] = useState(() => years[0] ?? new Date().getFullYear())
  const activeYear = years.includes(year) ? year : years[0]

  useEffect(() => {
    if (!selectedDateKey) return
    const selectedYear = Number(selectedDateKey.slice(0, 4))
    if (Number.isFinite(selectedYear) && years.includes(selectedYear)) {
      setYear(selectedYear)
    }
    // List selection only highlights the cell. Keep popover open only if it
    // already matches (square click sets openKey before selectedDateKey).
    setOpenKey((prev) => (prev === selectedDateKey ? prev : null))
  }, [selectedDateKey, years])

  const { weeks, monthLabels, totalInYear } = useMemo(() => {
    const byDay = new Map<string, ProfileContributionItem[]>()
    for (const item of contributions) {
      const d = new Date(item.createdAt)
      if (Number.isNaN(d.getTime())) continue
      if (d.getFullYear() !== activeYear) continue
      const key = toDateKey(d)
      const list = byDay.get(key) ?? []
      list.push(item)
      byDay.set(key, list)
    }

    const yearStart = new Date(activeYear, 0, 1)
    const yearEnd = new Date(activeYear, 11, 31)
    const gridStart = startOfDay(yearStart)
    gridStart.setDate(gridStart.getDate() - weekdaySun0(gridStart))
    const gridEnd = startOfDay(yearEnd)
    gridEnd.setDate(gridEnd.getDate() + (6 - weekdaySun0(gridEnd)))

    const weeks: DayCell[][] = []
    const cursor = new Date(gridStart)
    while (cursor <= gridEnd) {
      const week: DayCell[] = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(cursor)
        const dateKey = toDateKey(date)
        const items = byDay.get(dateKey) ?? []
        week.push({
          dateKey,
          date,
          count: items.length,
          inYear: date.getFullYear() === activeYear,
          items,
        })
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(week)
    }

    const monthLabels: { weekIndex: number; label: string }[] = []
    let lastMonth = -1
    weeks.forEach((week, weekIndex) => {
      const mid = week[3] ?? week[0]
      if (!mid?.inYear) return
      const month = mid.date.getMonth()
      if (month !== lastMonth) {
        lastMonth = month
        monthLabels.push({
          weekIndex,
          label: mid.date.toLocaleDateString(locale, { month: "short" }),
        })
      }
    })

    let totalInYear = 0
    for (const items of byDay.values()) totalInYear += items.length

    return { weeks, monthLabels, totalInYear }
  }, [contributions, activeYear, locale])

  const weekdayLabels = useMemo(() => {
    const ref = new Date(2024, 0, 7)
    return [1, 3, 5].map((offset) => {
      const d = new Date(ref)
      d.setDate(d.getDate() + offset)
      return {
        row: offset,
        label: d.toLocaleDateString(locale, { weekday: "short" }),
      }
    })
  }, [locale])

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("heatmapHeading")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("heatmapSummary", { count: totalInYear, year: activeYear })}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {years.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setYear(y)
                    setOpenKey(null)
                  }}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition-colors",
                    y === activeYear
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : null}
          {showContributeCta ? (
            <Link
              href="/profile/contribute"
              className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              {t("contributeCtaShort")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/15 p-3 sm:p-4">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div
              className="mb-1 grid gap-[3px]"
              style={{
                gridTemplateColumns: `28px repeat(${weeks.length}, minmax(10px, 12px))`,
              }}
            >
              <div />
              {weeks.map((_, weekIndex) => {
                const label = monthLabels.find((m) => m.weekIndex === weekIndex)
                return (
                  <div key={weekIndex} className="h-4 text-[10px] leading-none text-muted-foreground">
                    {label ? label.label : null}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-[3px]">
              <div className="flex w-7 shrink-0 flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, row) => {
                  const label = weekdayLabels.find((w) => w.row === row)
                  return (
                    <div
                      key={row}
                      className="flex h-[11px] items-center text-[9px] leading-none text-muted-foreground"
                    >
                      {label?.label ?? ""}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-[3px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((cell) => {
                      const level = cell.inYear ? levelForCount(cell.count) : 0
                      const hasContributions = cell.inYear && cell.count > 0

                      if (!hasContributions) {
                        return (
                          <div
                            key={cell.dateKey}
                            aria-hidden={!cell.inYear}
                            className={cn(
                              "h-[11px] w-[11px] rounded-[2px]",
                              cell.inYear ? LEVEL_CLASS[0] : "bg-transparent",
                            )}
                          />
                        )
                      }

                      const isOpen = openKey === cell.dateKey
                      const isSelected = selectedDateKey === cell.dateKey

                      return (
                        <Popover
                          key={cell.dateKey}
                          open={isOpen}
                          onOpenChange={(open) => {
                            setOpenKey(open ? cell.dateKey : null)
                            onSelectedDateKeyChange?.(open ? cell.dateKey : null)
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              aria-label={t("heatmapDayTitle", {
                                count: cell.count,
                                date: cell.date.toLocaleDateString(locale, {
                                  dateStyle: "medium",
                                }),
                              })}
                              className={cn(
                                "h-[11px] w-[11px] rounded-[2px] cursor-pointer transition-shadow",
                                LEVEL_CLASS[level],
                                (isOpen || isSelected) &&
                                  "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                              )}
                            />
                          </PopoverTrigger>
                          <PopoverContent
                            align="center"
                            side="top"
                            sideOffset={6}
                            className="w-[260px] overflow-hidden rounded-xl border-border/70 p-0 shadow-lg"
                          >
                            <div className="border-b border-border/50 px-3 py-2">
                              <p className="text-[11px] font-semibold text-foreground">
                                {cell.date.toLocaleDateString(locale, {
                                  day: "numeric",
                                  month: "short",
                                })}
                                <span className="font-normal text-muted-foreground">
                                  {" · "}
                                  {t("heatmapTooltipCount", { count: cell.items.length })}
                                </span>
                              </p>
                            </div>
                            <ul className="max-h-64 overflow-y-auto py-1">
                              {cell.items.map((item, index) => {
                                const typeLabel = t(`heatmapType_${item.type}`)
                                const name = itemShortLabel(item)
                                const statusDot =
                                  item.status === "approved"
                                    ? {
                                        ring: "bg-emerald-500/15",
                                        dot: "bg-emerald-500",
                                      }
                                    : item.status === "pending"
                                      ? {
                                          ring: "bg-amber-500/15",
                                          dot: "bg-amber-500",
                                        }
                                      : {
                                          ring: "bg-muted",
                                          dot: "bg-muted-foreground/50",
                                        }
                                return (
                                  <li key={item.id}>
                                    {index > 0 ? (
                                      <div className="mx-3 border-t border-border/40" />
                                    ) : null}
                                    <div className="flex items-center gap-2.5 px-3 py-2">
                                      <span
                                        className={cn(
                                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                          statusDot.ring,
                                        )}
                                        aria-hidden
                                      >
                                        <span className={cn("h-2 w-2 rounded-full", statusDot.dot)} />
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-[11px] leading-tight text-muted-foreground">
                                          {typeLabel}
                                        </p>
                                        <p className="truncate text-[12px] font-medium leading-tight text-foreground">
                                          {name}
                                        </p>
                                      </div>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </PopoverContent>
                        </Popover>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
          <span>{t("heatmapLess")}</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <span key={level} className={cn("h-[11px] w-[11px] rounded-[2px]", LEVEL_CLASS[level])} />
          ))}
          <span>{t("heatmapMore")}</span>
        </div>
      </div>
    </section>
  )
}
