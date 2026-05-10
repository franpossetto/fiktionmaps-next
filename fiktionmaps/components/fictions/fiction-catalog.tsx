"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { FictionCard } from "@/components/fictions/fiction-card"
import { useAuth } from "@/context/auth-context"
import { getFictionLikeCountsAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import { getMyLikedFictionIdsAction, toggleFictionLikeAction } from "@/src/users/infrastructure/next/user.actions"
import { useTranslations } from "next-intl"
import { ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS_PER_PAGE = 60
const ALL = "all"

type FictionType = "movie" | "tv-series" | "book"
type TabValue = "all" | FictionType

interface Props {
  initialFictions?: FictionWithMedia[]
  initialLikeCounts?: Record<string, number>
  initialPlaceCounts?: Record<string, number>
}

const TYPE_TAB_VALUES: TabValue[] = ["all", "movie", "tv-series", "book"]
const SORT_VALUES = ["popular", "title-asc", "year-desc", "year-asc"] as const
type SortValue = (typeof SORT_VALUES)[number]

const ACCENT = "text-[#4f9ef8]"

export function FictionCatalog({
  initialFictions = [],
  initialLikeCounts,
  initialPlaceCounts,
}: Props) {
  const { user } = useAuth()
  const t = useTranslations("Fictions")
  const tCommon = useTranslations("Common")

  const [fictions] = useState<FictionWithMedia[]>(initialFictions)
  const [locationCountMap] = useState<Map<string, number>>(
    () => new Map(Object.entries(initialPlaceCounts ?? {}).map(([id, c]) => [id, Number(c)])),
  )

  const [likeCountById, setLikeCountById] = useState<Record<string, number>>(initialLikeCounts ?? {})
  const [likedIds, setLikedIds] = useState<string[]>([])
  const likedSet = useMemo(() => new Set(likedIds), [likedIds])

  const [typeTab, setTypeTab] = useState<TabValue>("all")
  const [genreFilter, setGenreFilter] = useState(ALL)
  const [sortBy, setSortBy] = useState<SortValue>("popular")
  const [page, setPage] = useState(0)

  // Load user's liked ids
  useEffect(() => {
    if (!user) { setLikedIds([]); return }
    let cancelled = false
    ;(async () => {
      try {
        const data = await getMyLikedFictionIdsAction()
        if (!cancelled) setLikedIds(data)
      } catch { /* noop */ }
    })()
    return () => { cancelled = true }
  }, [user])

  const fetchedRef = useRef<Set<string>>(new Set(Object.keys(initialLikeCounts ?? {})))

  const genreOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of fictions) {
      const g = f.genre?.trim()
      if (g) map.set(g.toLowerCase(), g)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([v, l]) => ({ value: v, label: l }))
  }, [fictions])

  const filtered = useMemo(() => {
    return fictions.filter((f) => {
      if (typeTab !== ALL && f.type !== typeTab) return false
      if (genreFilter !== ALL && (f.genre?.trim().toLowerCase() ?? "") !== genreFilter) return false
      return true
    })
  }, [fictions, typeTab, genreFilter])

  const sorted = useMemo(() => {
    const items = [...filtered]
    if (sortBy === "title-asc") items.sort((a, b) => a.title.localeCompare(b.title))
    else if (sortBy === "year-desc") items.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    else if (sortBy === "year-asc") items.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    return items
  }, [filtered, sortBy])

  const displayed = sorted.slice(0, (page + 1) * ITEMS_PER_PAGE)
  const hasMore = displayed.length < sorted.length

  // Lazy-load like counts for newly-visible items
  const displayedKey = useMemo(() => displayed.map((f) => f.id).join(","), [displayed])
  useEffect(() => {
    const ids = displayedKey ? displayedKey.split(",").filter(Boolean) : []
    const newIds = ids.filter((id) => !fetchedRef.current.has(id))
    if (!newIds.length) return
    let cancelled = false
    ;(async () => {
      try {
        const counts = await getFictionLikeCountsAction(newIds)
        if (!cancelled) {
          for (const id of newIds) fetchedRef.current.add(id)
          setLikeCountById((prev) => ({ ...prev, ...counts }))
        }
      } catch { /* noop */ }
    })()
    return () => { cancelled = true }
  }, [displayedKey])

  const toggleLike = useCallback(
    async (fictionId: string) => {
      if (!user) return
      const wasLiked = likedSet.has(fictionId)
      const prev = likeCountById[fictionId] ?? 0
      setLikedIds((p) => { const s = new Set(p); wasLiked ? s.delete(fictionId) : s.add(fictionId); return Array.from(s) })
      setLikeCountById((p) => ({ ...p, [fictionId]: wasLiked ? Math.max(0, prev - 1) : prev + 1 }))
      const result = await toggleFictionLikeAction(fictionId)
      if (!result.success) {
        setLikedIds((p) => { const s = new Set(p); wasLiked ? s.add(fictionId) : s.delete(fictionId); return Array.from(s) })
        setLikeCountById((p) => ({ ...p, [fictionId]: prev }))
        return
      }
      setLikeCountById((p) => ({ ...p, [fictionId]: result.likeCount }))
      setLikedIds((p) => { const s = new Set(p); result.liked ? s.add(fictionId) : s.delete(fictionId); return Array.from(s) })
    },
    [user, likedSet, likeCountById],
  )

  const resetFilters = () => {
    setTypeTab("all")
    setGenreFilter(ALL)
    setSortBy("popular")
    setPage(0)
  }

  const hasActiveFilters = typeTab !== "all" || genreFilter !== ALL

  const sortLabels: Record<SortValue, string> = {
    popular: t("sortPopularity"),
    "title-asc": t("sortTitleAsc"),
    "year-desc": t("sortYearNewest"),
    "year-asc": t("sortYearOldest"),
  }

  const typeLabels: Record<TabValue, string> = {
    all: t("typeAll"),
    movie: t("typeMovie"),
    "tv-series": t("typeTvSeries"),
    book: t("typeBook"),
  }

  const activeGenreLabel = genreOptions.find((g) => g.value === genreFilter)?.label ?? t("genreAll")

  return (
    <div className="min-h-full bg-background">
      {/* ── Toolbar — mirrors Popcorn Time nav ──────────────────────────── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-0.5 px-6 py-0">

          {/* Type tabs — text with blue underline on active */}
          {TYPE_TAB_VALUES.map((value) => {
            const isActive = typeTab === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => { setTypeTab(value); setPage(0) }}
                className={cn(
                  "relative px-2.5 py-2 text-[12px] transition-colors",
                  isActive
                    ? "font-semibold text-foreground"
                    : "font-normal text-muted-foreground hover:text-foreground",
                )}
              >
                {typeLabels[value]}
                {isActive && (
                  <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full bg-[#4f9ef8]" />
                )}
              </button>
            )
          })}

          {/* Separator */}
          <div className="mx-1.5 h-3 w-px shrink-0 bg-border" />

          {/* Genre — "Género [Todos ▼]" */}
          <div className="relative flex items-center gap-1">
            <span className="text-[12px] text-muted-foreground">{t("genrePlaceholder")}</span>
            <div className="relative">
              <select
                value={genreFilter}
                onChange={(e) => { setGenreFilter(e.target.value); setPage(0) }}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={t("filterByGenre")}
              >
                <option value={ALL}>{t("genreAll")}</option>
                {genreOptions.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              <button type="button" tabIndex={-1} className={cn("flex items-center gap-0.5 text-[12px] font-semibold", ACCENT)}>
                {activeGenreLabel}
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Separator */}
          <div className="mx-1.5 h-3 w-px shrink-0 bg-border" />

          {/* Sort — "Ordenar por [Popularidad ▼]" */}
          <div className="relative flex items-center gap-1">
            <span className="text-[12px] text-muted-foreground">{t("sortByLabel")}</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as SortValue); setPage(0) }}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={t("sortFictions")}
              >
                {SORT_VALUES.map((v) => (
                  <option key={v} value={v}>{sortLabels[v]}</option>
                ))}
              </select>
              <button type="button" tabIndex={-1} className={cn("flex items-center gap-0.5 text-[12px] font-semibold", ACCENT)}>
                {sortLabels[sortBy]}
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {/* Results count */}
            <span className="text-[11px] text-muted-foreground/60">
              {t("resultsCount", { count: sorted.length })}
            </span>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-2.5 w-2.5" />
                {tCommon("clear")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <main className="px-8 pt-3 pb-8">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-sm text-muted-foreground">{t("noFictions")}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 text-sm text-muted-foreground underline-offset-2 hover:underline"
              >
                {tCommon("clear")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {displayed.map((fiction) => (
                <FictionCard
                  key={fiction.id}
                  fiction={fiction}
                  locationCount={locationCountMap.get(fiction.id) ?? 0}
                  href={`/fictions/${fiction.slug ?? fiction.id}`}
                  likeCount={likeCountById[fiction.id] ?? 0}
                  liked={likedSet.has(fiction.id)}
                  onToggleLike={user ? toggleLike : undefined}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-border px-8 py-2 text-[13px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  {tCommon("loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
