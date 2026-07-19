"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, BookOpen, ChevronDown, Clapperboard, Compass, Loader2, Map as MapIcon, MapPin, Search, Shuffle, Tv, X } from "lucide-react"
import { SearchScopeChip } from "@/components/ui/scoped-search-input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { cn, shuffleArray } from "@/lib/utils"
import { recentSearchesStorage, searchModeStorage, type RecentSearchItem, type SearchMode } from "@/lib/local-storage-service"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

// ── Constants ────────────────────────────────────────────────────────────────

const TAGLINES: Record<string, string[]> = {
  en: [
    "Where was that scene filmed?",
    "Explore cities through the stories you love.",
    "Find the real places behind your favorite films.",
    "Map every story, one location at a time.",
    "The world looks different when you know the film.",
  ],
  es: [
    "¿Dónde se rodó esa escena?",
    "Explorá ciudades a través de las historias que amás.",
    "Encontrá los lugares reales detrás de tus películas favoritas.",
    "Cada historia tiene un lugar en el mapa.",
    "El mundo se ve diferente cuando conocés la película.",
  ],
}

// Module-level counter — starts at 0 (safe for SSR), randomised on first client mount
let globalTaglineIndex = 0

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchHit =
  | { kind: "city"; city: City }
  | { kind: "fiction"; fiction: FictionWithMedia }

interface HomeSearchProps {
  cities: City[]
  fictions: FictionWithMedia[]
  placeCounts: Record<string, number>
  cityIdsWithPlaces: string[]
  locale: string
}

const NO_PLACES_SUGGESTIONS = 3

// ── Component ─────────────────────────────────────────────────────────────────

export function HomeSearch({ cities, fictions, placeCounts, cityIdsWithPlaces, locale }: HomeSearchProps) {
  const router = useRouter()
  const t = useTranslations("Home")
  const tFictions = useTranslations("Fictions")

  const [query, setQuery] = useState("")
  const [pendingHit, setPendingHit] = useState<SearchHit | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [mode, setMode] = useState<SearchMode>("map")
  const [modeOpen, setModeOpen] = useState(false)
  const [recents, setRecents] = useState<RecentSearchItem[]>([])
  const [rouletteSpinning, setRouletteSpinning] = useState(false)
  const [noPlacesModal, setNoPlacesModal] = useState<{ city: City; suggestions: City[] } | null>(null)
  const [isNavigating, startTransition] = useTransition()
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const modeRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const taglines = TAGLINES[locale] ?? TAGLINES.en
  const [taglineIndex, setTaglineIndex] = useState(() => globalTaglineIndex % taglines.length)

  // Hydrate from localStorage + randomise tagline after SSR
  useEffect(() => {
    setRecents(recentSearchesStorage.get() as RecentSearchItem[])
    setMode(searchModeStorage.get())
    // Randomise only on the client, after hydration matches the server-rendered index 0
    const random = Math.floor(Math.random() * taglines.length)
    globalTaglineIndex = random
    setTaglineIndex(random)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close mode dropdown on outside click
  useEffect(() => {
    if (!modeOpen) return
    function onPointerDown(e: PointerEvent) {
      if (!modeRef.current?.contains(e.target as Node)) setModeOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [modeOpen])

  const hasPlaces = (id: string) => (placeCounts[id] ?? 0) > 0

  const cityWithPlacesSet = useMemo(() => new Set(cityIdsWithPlaces), [cityIdsWithPlaces])
  const cityHasPlaces = (id: string) => cityWithPlacesSet.has(id)

  function pickSuggestedCities(excludeId: string): City[] {
    const pool = cities.filter((c) => c.id !== excludeId && cityHasPlaces(c.id))
    return shuffleArray(pool).slice(0, NO_PLACES_SUGGESTIONS)
  }

  function openNoPlacesModal(city: City) {
    setNoPlacesModal({ city, suggestions: pickSuggestedCities(city.id) })
  }

  const hits = useMemo((): SearchHit[] => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const cityHits: SearchHit[] = cities
      .filter((c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      .slice(0, 4).map((city) => ({ kind: "city", city }))
    const fictionHits: SearchHit[] = fictions
      .filter((f) =>
        f.title.toLowerCase().includes(q) ||
        (f.author?.toLowerCase().includes(q) ?? false) ||
        (f.genre?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 6).map((fiction) => ({ kind: "fiction", fiction }))
    return [...cityHits, ...fictionHits]
  }, [query, cities, fictions])

  const showDropdown = isFocused && !pendingHit && query.trim().length > 0

  // Reset active index whenever the hit list changes
  useEffect(() => { setActiveIndex(-1) }, [hits])

  // Scroll the highlighted item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  function isHitDisabled(hit: SearchHit): boolean {
    return hit.kind === "fiction" && !hasPlaces(hit.fiction.id)
  }

  function typeBadge(type: FictionWithMedia["type"]) {
    if (type === "movie") return tFictions("typeMovie")
    if (type === "book") return tFictions("typeBook")
    return tFictions("typeTvBadge")
  }

  function advanceTagline() {
    globalTaglineIndex = (globalTaglineIndex + 1) % taglines.length
    setTaglineIndex(globalTaglineIndex)
  }

  function changeMode(next: SearchMode) {
    setMode(next)
    searchModeStorage.set(next)
    setModeOpen(false)
  }

  function hrefForFiction(fiction: FictionWithMedia): string {
    if (mode === "map") return `/map?fiction=${fiction.id}`
    return `/fictions/${fiction.slug ?? fiction.id}`
  }

  function hrefForHit(hit: SearchHit): string {
    if (hit.kind === "city") {
      return mode === "article" ? `/cities/${hit.city.slug}` : `/map?city=${hit.city.slug}`
    }
    return hrefForFiction(hit.fiction)
  }

  function pushRecent(item: RecentSearchItem) {
    recentSearchesStorage.add(item)
    setRecents(recentSearchesStorage.get() as RecentSearchItem[])
  }

  function removeRecent(id: string) {
    recentSearchesStorage.remove(id)
    setRecents(recentSearchesStorage.get() as RecentSearchItem[])
  }

  function navigate(href: string) {
    // Wrap in a transition so the page stays interactive (and the search bar
    // keeps its content + shows a spinner) while the destination route loads,
    // instead of flashing an empty bar that looks like a failed search.
    startTransition(() => {
      router.push(href as Parameters<typeof router.push>[0])
    })
  }

  function openRecent(recent: RecentSearchItem) {
    // Same rule as search: a city saved in map mode that no longer has places
    // shouldn't open an empty map — suggest alternatives instead.
    if (recent.kind === "city" && recent.mode === "map" && !cityHasPlaces(recent.id)) {
      const city = cities.find((c) => c.id === recent.id)
      if (city) {
        openNoPlacesModal(city)
        return
      }
    }
    navigate(recent.href)
  }

  function selectHit(hit: SearchHit) {
    setQuery("")
    setPendingHit(hit)
    setIsFocused(false)
  }

  function handleSubmit() {
    const hit = pendingHit ?? (query.trim() && hits.length > 0 ? hits[0] : null)
    if (!hit) return
    // In map mode a city without places can't be explored on the map — suggest
    // alternatives instead of navigating to an empty map. (Article mode is fine.)
    if (hit.kind === "city" && mode === "map" && !cityHasPlaces(hit.city.id)) {
      openNoPlacesModal(hit.city)
      setQuery("")
      setPendingHit(null)
      setIsFocused(false)
      return
    }
    const href = hrefForHit(hit)
    const item: RecentSearchItem = {
      id: hit.kind === "city" ? hit.city.id : hit.fiction.id,
      label: hit.kind === "city" ? hit.city.name : hit.fiction.title,
      kind: hit.kind,
      fictionType: hit.kind === "fiction" ? hit.fiction.type : undefined,
      href,
      mode,
    }
    advanceTagline()
    pushRecent(item)
    // Keep the query / selected chip visible while the route loads so the bar
    // doesn't blank out mid-navigation. The home page unmounts on arrival, so
    // there's no stale state to clean up.
    setIsFocused(false)
    navigate(href)
  }

  const roulettePool = useMemo(
    () => fictions.filter((f) => hasPlaces(f.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fictions, placeCounts],
  )
  const rouletteCityPool = useMemo(
    () => cities.filter((city) => cityWithPlacesSet.has(city.id)),
    [cities, cityWithPlacesSet],
  )

  function handleRoulette() {
    if (rouletteSpinning) return
    setRouletteSpinning(true)
    setTimeout(() => {
      setRouletteSpinning(false)
      if (mode === "map") {
        if (rouletteCityPool.length === 0) return
        const pick = rouletteCityPool[Math.floor(Math.random() * rouletteCityPool.length)]
        navigate(`/map?city=${encodeURIComponent(pick.slug)}`)
        return
      }

      if (roulettePool.length === 0) return
      const pick = roulettePool[Math.floor(Math.random() * roulettePool.length)]
      navigate(hrefForFiction(pick))
    }, 900)
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-[580px] flex-col gap-3">

        {/* Tagline */}
        <div className="mb-4 flex min-h-[4.5rem] items-center justify-center overflow-hidden px-2">
          <AnimatePresence mode="wait">
            <motion.h1
              key={taglineIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="text-center text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
            >
              {taglines[taglineIndex]}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Search bar */}
        <div
          className="relative"
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFocused(false)
          }}
        >
          <div
            className={cn(
              "flex cursor-text items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 shadow-sm transition-[box-shadow,border-color]",
              isFocused && "border-ring shadow-md ring-1 ring-ring/20",
            )}
            onClick={() => inputRef.current?.focus()}
          >
            <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden />

            {pendingHit ? (
              /* Selected item chip */
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <SearchScopeChip
                  chip={{
                    label: pendingHit.kind === "city" ? pendingHit.city.name : pendingHit.fiction.title,
                    imageUrl: pendingHit.kind === "fiction" ? pendingHit.fiction.coverImage : null,
                    onClear: () => { setPendingHit(null); setQuery(""); inputRef.current?.focus() },
                  }}
                />
              </div>
            ) : (
              /* Normal text input */
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (!showDropdown || hits.length === 0) {
                    if (e.key === "Enter") handleSubmit()
                    return
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault()
                    setActiveIndex((prev) => {
                      let next = prev + 1
                      while (next < hits.length && isHitDisabled(hits[next])) next++
                      return next < hits.length ? next : prev
                    })
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault()
                    setActiveIndex((prev) => {
                      if (prev <= 0) return -1
                      let next = prev - 1
                      while (next > 0 && isHitDisabled(hits[next])) next--
                      return isHitDisabled(hits[next]) ? -1 : next
                    })
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    setIsFocused(false)
                    setActiveIndex(-1)
                  } else if (e.key === "Enter") {
                    if (activeIndex >= 0 && !isHitDisabled(hits[activeIndex])) {
                      e.preventDefault()
                      selectHit(hits[activeIndex])
                    } else {
                      handleSubmit()
                    }
                  }
                }}
                placeholder={t("searchPlaceholder")}
                className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            )}

            {/* Surprise me — visible only when nothing is selected and input is empty */}
            {!pendingHit && !query.trim() && (
              <button
                type="button"
                onClick={handleRoulette}
                disabled={rouletteSpinning}
                className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <motion.div
                  animate={rouletteSpinning ? { rotate: 360 } : { rotate: 0 }}
                  transition={rouletteSpinning ? { duration: 0.8, ease: "linear", repeat: Infinity } : { duration: 0 }}
                  className="flex"
                >
                  <Shuffle className="h-3.5 w-3.5" aria-hidden />
                </motion.div>
                <span>{t("surpriseMe")}</span>
              </button>
            )}

            {/* Mode selector */}
            <div ref={modeRef} className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setModeOpen((o) => !o) }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
                  "hover:bg-accent hover:text-foreground",
                  modeOpen && "bg-accent text-foreground",
                )}
              >
                {mode === "map"
                  ? <MapIcon className="h-3.5 w-3.5" aria-hidden />
                  : <BookOpen className="h-3.5 w-3.5" aria-hidden />}
                <span>{mode === "map" ? t("searchModeMap") : t("searchModeArticle")}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", modeOpen && "rotate-180")} aria-hidden />
              </button>

              {modeOpen && (
                <div className="absolute bottom-[calc(100%+6px)] right-0 z-50 w-36 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                  {(["map", "article"] as SearchMode[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => changeMode(opt)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-accent",
                        mode === opt ? "text-foreground font-medium" : "text-muted-foreground",
                      )}
                    >
                      {opt === "map"
                        ? <MapIcon className="h-4 w-4 shrink-0" aria-hidden />
                        : <BookOpen className="h-4 w-4 shrink-0" aria-hidden />}
                      {opt === "map" ? t("searchModeMap") : t("searchModeArticle")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isNavigating || (!pendingHit && (!query.trim() || hits.length === 0))}
              aria-label={t("searchSubmit")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-20 hover:opacity-80"
            >
              {isNavigating
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                : <ArrowUp className="h-4 w-4" aria-hidden />}
            </button>
          </div>

          {/* Dropdown results */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
              {hits.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">{t("noResults")}</div>
              ) : (
                <ul ref={listRef} className="max-h-80 overflow-y-auto p-1" role="listbox">
                  {hits.map((hit, index) => {
                    const key = hit.kind === "city" ? `city-${hit.city.id}` : `fiction-${hit.fiction.id}`
                    const label = hit.kind === "city" ? hit.city.name : hit.fiction.title
                    const badge = hit.kind === "city" ? t("cityBadge") : typeBadge(hit.fiction.type)
                    const noPlaces = hit.kind === "fiction" && !hasPlaces(hit.fiction.id)
                    // City without places in map mode stays clickable (opens the
                    // suggestions modal), but we hint it has no places.
                    const cityNoPlaces = hit.kind === "city" && mode === "map" && !cityHasPlaces(hit.city.id)
                    const sub = noPlaces || cityNoPlaces
                      ? t("noPlaces")
                      : hit.kind === "city"
                        ? hit.city.country
                        : (hit.fiction.year?.toString() ?? "")
                    const isActive = index === activeIndex
                    return (
                      <li key={key} role="option" aria-selected={isActive}>
                        <button
                          type="button"
                          disabled={noPlaces}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectHit(hit)}
                          onMouseEnter={() => !noPlaces && setActiveIndex(index)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                            isActive && !noPlaces ? "bg-accent" : "hover:bg-accent disabled:hover:bg-transparent",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {badge}
                            </span>
                            <span className="truncate text-sm font-medium text-foreground">{label}</span>
                          </span>
                          {sub && (
                            <span className={cn("ml-2 shrink-0 text-xs", noPlaces || cityNoPlaces ? "text-muted-foreground/60" : "text-muted-foreground")}>
                              {sub}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Recent searches + catalog chip */}
        {!query.trim() && (
          <div className="flex flex-wrap justify-center gap-2 pt-[14px]">
            {recents.map((r) => {
              const Icon = r.kind === "city"
                ? MapPin
                : r.fictionType === "movie"
                  ? Clapperboard
                  : r.fictionType === "tv-series"
                    ? Tv
                    : BookOpen
              return (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background py-1.5 pl-2.5 pr-1.5 text-sm text-foreground/80 shadow-sm"
                >
                  <Icon className="h-3 w-3 shrink-0 text-foreground/50" aria-hidden />
                  <button
                    type="button"
                    onClick={() => openRecent(r)}
                    className="transition-colors hover:text-foreground"
                  >
                    {r.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecent(r.id)}
                    aria-label="Remove"
                    className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}

            <Link
              href="/fictions"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background py-1.5 pl-2.5 pr-3 text-sm text-foreground/80 shadow-sm transition-colors hover:text-foreground"
            >
              <Compass className="h-3 w-3 shrink-0 text-foreground/50" aria-hidden />
              {t("catalog")}
            </Link>
          </div>
        )}

      </div>

      {/* No-places city modal — map mode can't show an empty city, so suggest others */}
      <Dialog open={noPlacesModal !== null} onOpenChange={(open) => { if (!open) setNoPlacesModal(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("noPlacesCityTitle")}</DialogTitle>
            <DialogDescription>
              {t("noPlacesCityDescription", { city: noPlacesModal?.city.name ?? "" })}
            </DialogDescription>
          </DialogHeader>

          {noPlacesModal && noPlacesModal.suggestions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {noPlacesModal.suggestions.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => { setNoPlacesModal(null); navigate(`/map?city=${city.slug}`) }}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{city.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{city.country}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
