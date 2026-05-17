"use client"

/**
 * Legacy fictions catalog (rails layout + dense filters). Kept only as reference — not imported by any route.
 * TODO: remove when no longer needed.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { FictionCard } from "@/components/fictions/fiction-card"
import { ArrowUpDown, Calendar, ChevronLeft, ChevronRight, Film, Shapes, UserRound, X } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useTranslations } from "next-intl"
import { getFictionLikeCountsAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import { getMyLikedFictionIdsAction, toggleFictionLikeAction } from "@/src/users/infrastructure/next/user.actions"
import { useRouter } from "@/i18n/navigation"

const ITEMS_PER_PAGE = 50
const ALL_FILTER_VALUE = "all"
const DEFAULT_SORT_VALUE = "popular"
const FILTER_SELECT_CLASSNAME =
  "h-7 min-w-[98px] rounded-md border border-transparent bg-muted/70 pl-7 pr-2 text-xs text-foreground outline-none transition-colors hover:bg-accent/60 focus:bg-accent/70"

interface FictionLandingV2ReferenceProps {
  /** Fictions from DB (server). When provided, no client fetch for list. */
  initialFictions?: FictionWithMedia[]
  /** Scene counts per fiction id pre-fetched server-side. */
  initialSceneCounts?: Record<string, number>
  /** Like counts per fiction id pre-fetched server-side. */
  initialLikeCounts?: Record<string, number>
  /** Place counts per fiction id pre-fetched server-side. */
  initialPlaceCounts?: Record<string, number>
  focusFictionId?: string | null
  onFocusHandled?: () => void
  initialSearch?: string
}

export function FictionLandingV2Reference({
  initialFictions,
  initialSceneCounts,
  initialLikeCounts,
  initialPlaceCounts,
  focusFictionId,
  onFocusHandled,
  initialSearch = "",
}: FictionLandingV2ReferenceProps) {
  const { user } = useAuth()
  const router = useRouter()
  const t = useTranslations("Fictions")
  const tCommon = useTranslations("Common")
  const emptyState = (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Film className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{t("noFictions")}</p>
    </div>
  )
  const [allFictions, setAllFictions] = useState<FictionWithMedia[]>(initialFictions ?? [])
  const [locationCountMap, setLocationCountMap] = useState<Map<string, number>>(
    () => new Map(Object.entries(initialPlaceCounts ?? {}).map(([id, count]) => [id, Number(count)]))
  )
  const [sceneCountMap] = useState<Map<string, number>>(
    () => new Map(Object.entries(initialSceneCounts ?? {}))
  )
  const [likeCountByFictionId, setLikeCountByFictionId] = useState<Record<string, number>>(
    initialLikeCounts ?? {}
  )
  const [likedFictionIds, setLikedFictionIds] = useState<string[]>([])

  const likedFictionIdSet = useMemo(() => new Set(likedFictionIds), [likedFictionIds])

  useEffect(() => {
    if (initialFictions !== undefined) {
      setAllFictions(initialFictions)
    }
  }, [initialFictions])

  useEffect(() => {
    if (initialPlaceCounts === undefined) return
    setLocationCountMap(
      new Map(Object.entries(initialPlaceCounts).map(([id, count]) => [id, Number(count)]))
    )
  }, [initialPlaceCounts])

  const [search, setSearch] = useState(initialSearch)
  const [directorFilter, setDirectorFilter] = useState(ALL_FILTER_VALUE)
  const [genreFilter, setGenreFilter] = useState(ALL_FILTER_VALUE)
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER_VALUE)
  const [yearFilter, setYearFilter] = useState(ALL_FILTER_VALUE)
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_VALUE)
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [page, setPage] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearch(initialSearch)
    setPage(0)
  }, [initialSearch])

  const directorOptions = useMemo(() => {
    const names = new Map<string, string>()
    for (const fiction of allFictions) {
      const author = fiction.author?.trim()
      if (author) names.set(author.toLowerCase(), author)
    }
    return Array.from(names.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [allFictions])

  const genreOptions = useMemo(() => {
    const genres = new Map<string, string>()
    for (const fiction of allFictions) {
      const genre = fiction.genre?.trim()
      if (genre) genres.set(genre.toLowerCase(), genre)
    }
    return Array.from(genres.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [allFictions])

  const typeOptions = useMemo(() => {
    const labels: Record<string, string> = {
      movie: t("typeMovie"),
      "tv-series": t("typeTvSeries"),
      book: t("typeBook"),
    }
    const types = new Set<string>()
    for (const fiction of allFictions) {
      if (fiction.type) types.add(fiction.type)
    }
    return Array.from(types)
      .sort()
      .map((value) => ({ value, label: labels[value] ?? value }))
  }, [allFictions, t])

  const yearOptions = useMemo(() => {
    const years = new Set<number>()
    for (const fiction of allFictions) {
      if (fiction.year) years.add(fiction.year)
    }
    return Array.from(years)
      .sort((a, b) => b - a)
      .map((year) => ({ value: String(year), label: String(year) }))
  }, [allFictions])

  const hasActiveFilters =
    directorFilter !== ALL_FILTER_VALUE ||
    genreFilter !== ALL_FILTER_VALUE ||
    typeFilter !== ALL_FILTER_VALUE ||
    yearFilter !== ALL_FILTER_VALUE

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allFictions.filter((f) => {
      const matchesQuery =
        q.length === 0 ||
        f.title.toLowerCase().includes(q) ||
        f.genre.toLowerCase().includes(q) ||
        (f.author?.toLowerCase().includes(q) ?? false)
      const matchesDirector =
        directorFilter === ALL_FILTER_VALUE || (f.author?.trim().toLowerCase() ?? "") === directorFilter
      const matchesGenre =
        genreFilter === ALL_FILTER_VALUE || (f.genre?.trim().toLowerCase() ?? "") === genreFilter
      const matchesType = typeFilter === ALL_FILTER_VALUE || f.type === typeFilter
      const matchesYear = yearFilter === ALL_FILTER_VALUE || String(f.year ?? "") === yearFilter
      return matchesQuery && matchesDirector && matchesGenre && matchesType && matchesYear
    })
  }, [search, directorFilter, genreFilter, typeFilter, yearFilter, allFictions])

  const sortedFiltered = useMemo(() => {
    const items = [...filtered]
    if (sortBy === "title-asc") {
      items.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === "year-desc") {
      items.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    } else if (sortBy === "year-asc") {
      items.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    }
    return items
  }, [filtered, sortBy])

  const displayedItems = sortedFiltered.slice(0, (page + 1) * ITEMS_PER_PAGE)
  const hasMore = displayedItems.length < filtered.length

  useEffect(() => {
    if (!focusFictionId) return
    const target = allFictions.find((f) => f.id === focusFictionId)
    if (target) {
      router.push(`/fictions/${target.slug ?? target.id}`)
    }
    onFocusHandled?.()
  }, [focusFictionId, onFocusHandled, allFictions, router])

  // User-specific likes: which fictions are liked by the logged-in user.
  useEffect(() => {
    if (!user) {
      setLikedFictionIds([])
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const data = await getMyLikedFictionIdsAction()
        if (!cancelled) setLikedFictionIds(data)
      } catch {
        if (!cancelled) setLikedFictionIds([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  // Track which fiction ids already have their like count loaded.
  // Initialised with the server-provided ids to avoid redundant fetches on scroll.
  const fetchedLikeIdsRef = useRef<Set<string>>(new Set(Object.keys(initialLikeCounts ?? {})))

  const displayedFictionIdsKey = useMemo(
    () => displayedItems.map((f) => f.id).join(","),
    [displayedItems],
  )

  // Public like counts — only fetch ids that haven't been loaded yet.
  useEffect(() => {
    const ids = displayedFictionIdsKey ? displayedFictionIdsKey.split(",").filter(Boolean) : []
    const newIds = ids.filter((id) => !fetchedLikeIdsRef.current.has(id))
    if (newIds.length === 0) return

    let cancelled = false
    ;(async () => {
      try {
        const newCounts = await getFictionLikeCountsAction(newIds)
        if (!cancelled) {
          for (const id of newIds) fetchedLikeIdsRef.current.add(id)
          setLikeCountByFictionId((prev) => ({ ...prev, ...newCounts }))
        }
      } catch {
        // noop — stale counts remain visible
      }
    })()

    return () => {
      cancelled = true
    }
  }, [displayedFictionIdsKey])

  const toggleLike = useCallback(
    async (fictionId: string) => {
      if (!user) return

      const wasLiked = likedFictionIdSet.has(fictionId)
      const prevCount = likeCountByFictionId[fictionId] ?? 0

      // Optimistic update — instant feedback
      setLikedFictionIds((prev) => {
        const set = new Set(prev)
        if (wasLiked) set.delete(fictionId)
        else set.add(fictionId)
        return Array.from(set)
      })
      setLikeCountByFictionId((prev) => ({
        ...prev,
        [fictionId]: wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
      }))

      const result = await toggleFictionLikeAction(fictionId)

      if (!result.success) {
        // Revert on error
        setLikedFictionIds((prev) => {
          const set = new Set(prev)
          if (wasLiked) set.add(fictionId)
          else set.delete(fictionId)
          return Array.from(set)
        })
        setLikeCountByFictionId((prev) => ({ ...prev, [fictionId]: prevCount }))
        return
      }

      // Reconcile with authoritative server values
      setLikeCountByFictionId((prev) => ({ ...prev, [fictionId]: result.likeCount }))
      setLikedFictionIds((prev) => {
        const set = new Set(prev)
        if (result.liked) set.add(fictionId)
        else set.delete(fictionId)
        return Array.from(set)
      })
    },
    [user, likedFictionIdSet, likeCountByFictionId],
  )

  return (
    <div ref={scrollContainerRef} className="relative h-full overflow-y-auto bg-background">
      <div className="px-6 pb-16 pt-10 sm:px-8 lg:px-10 lg:pt-14">
        <div className="mb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("landingTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("landingSubtitle")}
          </p>
        </div>

        <div className="mt-10 mb-8 flex justify-end">
          <div className="w-full max-w-fit">
            <div className="flex w-full items-center justify-end gap-1 overflow-x-auto pb-0.5">
              {!filtersCollapsed ? (
                <>
                  <div className="relative shrink-0">
                    <Shapes className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={typeFilter}
                      onChange={(e) => {
                        setTypeFilter(e.target.value)
                        setPage(0)
                      }}
                      className={FILTER_SELECT_CLASSNAME}
                      aria-label={t("filterByType")}
                    >
                      <option value={ALL_FILTER_VALUE}>{t("typePlaceholder")}</option>
                      {typeOptions.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative shrink-0">
                    <Film className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={genreFilter}
                      onChange={(e) => {
                        setGenreFilter(e.target.value)
                        setPage(0)
                      }}
                      className={FILTER_SELECT_CLASSNAME}
                      aria-label={t("filterByGenre")}
                    >
                      <option value={ALL_FILTER_VALUE}>{t("genrePlaceholder")}</option>
                      {genreOptions.map((genre) => (
                        <option key={genre.value} value={genre.value}>
                          {genre.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative shrink-0">
                    <UserRound className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={directorFilter}
                      onChange={(e) => {
                        setDirectorFilter(e.target.value)
                        setPage(0)
                      }}
                      className={FILTER_SELECT_CLASSNAME}
                      aria-label={t("filterByDirector")}
                    >
                      <option value={ALL_FILTER_VALUE}>{t("directorPlaceholder")}</option>
                      {directorOptions.map((director) => (
                        <option key={director.value} value={director.value}>
                          {director.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative shrink-0">
                    <Calendar className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={yearFilter}
                      onChange={(e) => {
                        setYearFilter(e.target.value)
                        setPage(0)
                      }}
                      className={FILTER_SELECT_CLASSNAME}
                      aria-label={t("filterByYear")}
                    >
                      <option value={ALL_FILTER_VALUE}>{t("yearPlaceholder")}</option>
                      {yearOptions.map((year) => (
                        <option key={year.value} value={year.value}>
                          {year.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative shrink-0">
                    <ArrowUpDown className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value)
                        setPage(0)
                      }}
                      className={FILTER_SELECT_CLASSNAME}
                      aria-label={t("sortFictions")}
                    >
                      <option value="popular">{t("sortPlaceholder")}</option>
                      <option value="title-asc">{t("sortTitleAsc")}</option>
                      <option value="year-desc">{t("sortYearNewest")}</option>
                      <option value="year-asc">{t("sortYearOldest")}</option>
                    </select>
                  </div>

                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDirectorFilter(ALL_FILTER_VALUE)
                        setGenreFilter(ALL_FILTER_VALUE)
                        setTypeFilter(ALL_FILTER_VALUE)
                        setYearFilter(ALL_FILTER_VALUE)
                        setPage(0)
                      }}
                      className="inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent bg-muted/70 px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      {tCommon("clear")}
                    </button>
                  ) : null}
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setFiltersCollapsed((prev) => !prev)}
                className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-muted/70 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={filtersCollapsed ? t("expandFilters") : t("collapseFilters")}
              >
                {filtersCollapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {t("resultsCount", { count: filtered.length })}
              </span>
            </div>
          </div>
        </div>

        <main>
          {displayedItems.length === 0 ? (
            emptyState
          ) : (
            <>
              <div className="grid grid-cols-2 gap-[19px] pb-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {displayedItems.map((fiction) => (
                  <FictionCard
                    key={fiction.id}
                    fiction={fiction}
                    locationCount={locationCountMap.get(fiction.id) ?? 0}
                    sceneCount={sceneCountMap.get(fiction.id) ?? 0}
                    href={`/fictions/${fiction.slug ?? fiction.id}`}
                    likeCount={likeCountByFictionId[fiction.id] ?? 0}
                    liked={likedFictionIdSet.has(fiction.id)}
                    onToggleLike={user ? toggleLike : undefined}
                  />
                ))}
              </div>

              {hasMore && filtered.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-center py-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {tCommon("loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
        </div>
      </div>
  )
}
