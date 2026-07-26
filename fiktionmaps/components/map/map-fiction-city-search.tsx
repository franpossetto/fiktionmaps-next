"use client"

/**
 * Map header search: mode depends on fiction filter count.
 * City chip fixed; fiction chips scroll; pencil expands search or opens fiction picker.
 */

import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { MapPin, Plus, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { AssetThumbImage } from "@/components/ui/asset-thumb-image"
import { SearchScopeChip, SCOPE_CHIP_CLASS } from "@/components/ui/scoped-search-input"
import { Skeleton } from "@/components/ui/skeleton"
import { fictionCoverThumbUrl } from "@/lib/asset-images/fiction-cover-thumb"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { prefetchCityMapData } from "@/lib/map/city-map-data-cache"
import { resolveMapBarSearchMode } from "@/lib/map/map-search-mode"
import { isAllFictionsSelected } from "@/lib/map/map-url"
import { MAP_MODE_CITY, MAP_MODE_WORLD, type MapBrowseMode } from "@/lib/map/world-map"
import { cn } from "@/lib/utils"
import { getMapSearchCatalogAction } from "@/src/places/infrastructure/next/place.actions"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { MapCitySearchEntry } from "@/src/places/domain/map-search-catalog.entity"
import type { MapFictionCitySearchEntry } from "@/src/places/domain/map-fiction-city-pair.entity"

const MAX_CITY_HITS = 3
const MAX_PAIR_HITS = 6
const MAX_PLACE_HITS = 8

const MAP_BAR_CLASS =
  "flex w-full min-w-0 min-h-10 items-center gap-2 overflow-hidden rounded-full border border-chrome-border bg-chrome/90 px-3 py-1 text-foreground shadow-none backdrop-blur-md transition-[box-shadow,border-color] focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30"

const MAP_SEARCH_TYPE_BADGE =
  "shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"

function MapSearchHitButton({
  typeLabel,
  media,
  title,
  subtitle,
  cityName,
  cityPreposition,
  onSelect,
}: {
  typeLabel: string
  media: ReactNode
  title: string
  subtitle?: string | null
  cityName?: string | null
  cityPreposition?: string
  onSelect: () => void
}) {
  const showCityLine = Boolean(cityName && cityPreposition)

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent"
    >
      <span className={MAP_SEARCH_TYPE_BADGE}>{typeLabel}</span>
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-muted">{media}</span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-1 overflow-hidden">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          {showCityLine ? (
            <>
              <span className="shrink-0 text-xs text-muted-foreground">{cityPreposition}</span>
              <span className="truncate text-xs font-semibold text-primary">{cityName}</span>
            </>
          ) : null}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </button>
  )
}

export type MapFictionChipPreview = {
  id: string
  title: string
  coverImage: string | null
  coverImageThumb?: string | null
}

type FictionChipItem =
  | { kind: "fiction"; fiction: FictionWithMedia }
  | { kind: "preview"; preview: MapFictionChipPreview }
  | { kind: "skeleton"; id: string }

type MapSearchHit =
  | { kind: "city"; city: MapCitySearchEntry }
  | { kind: "fiction-city"; entry: MapFictionCitySearchEntry }
  | { kind: "place"; place: Place }

type MapFictionCitySearchProps = {
  selectedCity: City
  /** When world, scope chip shows Free World and fiction chips are hidden. */
  browseMode?: MapBrowseMode
  availableFictions: FictionWithMedia[]
  selectedFictionIds: string[]
  fictionChipPreviews?: MapFictionChipPreview[] | null
  /** Active places in the current city (for scoped place search). */
  cityPlaces: Place[]
  onSelectPair: (entry: MapFictionCitySearchEntry) => void
  onSelectCity: (cityId: string) => void
  onSelectPlace: (place: Place) => void
  onRemoveFiction: (fictionId: string) => void
  /** When no fiction is selected, open the fiction selector dialog. */
  onRequestPickFiction: () => void
  className?: string
}

function FictionChipSkeleton({ onRemove }: { onRemove?: () => void }) {
  const tMap = useTranslations("Map")

  return (
    <span
      className={cn(SCOPE_CHIP_CLASS, "max-w-[10rem] shrink-0")}
      aria-busy="true"
      aria-label={tMap("fictionChipLoading")}
    >
      <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
      <Skeleton className="h-3.5 min-w-[4.5rem] max-w-[5.5rem] flex-1 rounded-sm" />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={tMap("removeFictionChipLoading")}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      ) : (
        <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
      )}
    </span>
  )
}

const FICTION_CHIP_SELECTED_CLASS =
  "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-sm"

function FictionMapChip({
  title,
  coverSrc,
  fictionId,
  missingXs,
  isSelected,
  onSelect,
  onRemove,
  compact,
}: {
  title: string
  coverSrc: string | null
  fictionId: string
  missingXs?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onRemove: () => void
  /** Shown in the search field row while typing. */
  compact?: boolean
}) {
  const tMap = useTranslations("Map")
  const cover = coverSrc ?? DEFAULT_FICTION_COVER
  const labelBody = (
    <>
      <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-muted">
        <AssetThumbImage
          src={cover}
          size={20}
          className="rounded-full"
          ensure={
            missingXs
              ? { entityType: "fiction", entityId: fictionId, role: "cover" }
              : undefined
          }
        />
      </span>
      <span className="truncate text-xs font-semibold text-foreground">{title}</span>
    </>
  )

  return (
    <span
      className={cn(
        SCOPE_CHIP_CLASS,
        compact ? "max-w-[9.5rem] shrink-0" : "max-w-[10rem] shrink-0",
        isSelected && FICTION_CHIP_SELECTED_CLASS,
      )}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={isSelected}
          aria-label={tMap("selectFictionChipForSearch", { title })}
          className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-left transition-colors"
        >
          {labelBody}
        </button>
      ) : (
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">{labelBody}</span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={tMap("removeFictionChip", { title })}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </span>
  )
}

function renderFictionChipItem(
  item: FictionChipItem,
  activeSearchFictionId: string | null,
  onActivateFiction: (id: string) => void,
  onRemoveFiction: (id: string) => void,
) {
  if (item.kind === "fiction") {
    const hasSource =
      Boolean(item.fiction.coverImage?.trim()) || Boolean(item.fiction.coverImageLarge?.trim())
    return (
      <FictionMapChip
        key={item.fiction.id}
        title={item.fiction.title}
        coverSrc={fictionCoverThumbUrl(item.fiction)}
        fictionId={item.fiction.id}
        missingXs={!item.fiction.coverImageThumb?.trim() && hasSource}
        isSelected={activeSearchFictionId === item.fiction.id}
        onSelect={() => onActivateFiction(item.fiction.id)}
        onRemove={() => onRemoveFiction(item.fiction.id)}
      />
    )
  }
  if (item.kind === "preview") {
    const cover =
      item.preview.coverImageThumb?.trim() ||
      item.preview.coverImage?.trim() ||
      null
    return (
      <FictionMapChip
        key={item.preview.id}
        title={item.preview.title}
        coverSrc={cover}
        fictionId={item.preview.id}
        missingXs={!item.preview.coverImageThumb?.trim() && Boolean(cover)}
        isSelected={activeSearchFictionId === item.preview.id}
        onSelect={() => onActivateFiction(item.preview.id)}
        onRemove={() => onRemoveFiction(item.preview.id)}
      />
    )
  }
  return (
    <FictionChipSkeleton key={item.id} onRemove={() => onRemoveFiction(item.id)} />
  )
}

export function MapFictionCitySearch({
  selectedCity,
  browseMode = MAP_MODE_CITY,
  availableFictions,
  selectedFictionIds,
  fictionChipPreviews,
  cityPlaces,
  onSelectPair,
  onSelectCity,
  onSelectPlace,
  onRemoveFiction,
  onRequestPickFiction,
  className,
}: MapFictionCitySearchProps) {
  const tMap = useTranslations("Map")
  const tCommon = useTranslations("Common")
  const isWorld = browseMode === MAP_MODE_WORLD
  const [search, setSearch] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeSearchFictionId, setActiveSearchFictionId] = useState<string | null>(null)
  const [pairs, setPairs] = useState<MapFictionCitySearchEntry[]>([])
  const [cities, setCities] = useState<MapCitySearchEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const query = search.trim()
  const allSelected = isAllFictionsSelected(selectedFictionIds, availableFictions)
  const { mode: searchMode, singleFictionId } = resolveMapBarSearchMode(
    selectedFictionIds,
    availableFictions,
  )
  const scopeFictionId = isWorld
    ? null
    : (activeSearchFictionId ?? (searchMode === "scoped" ? singleFictionId : null))

  const isPlaceOnlySearch = Boolean(
    !isWorld &&
      scopeFictionId &&
      (activeSearchFictionId != null || searchMode === "scoped"),
  )

  const scopedPlaces = useMemo(() => {
    if (!scopeFictionId) return []
    return cityPlaces.filter((p) => p.fictionId === scopeFictionId)
  }, [cityPlaces, scopeFictionId])

  const previewById = useMemo(
    () => new Map((fictionChipPreviews ?? []).map((p) => [p.id, p])),
    [fictionChipPreviews],
  )

  const fictionChipItems = useMemo((): FictionChipItem[] => {
    if (selectedFictionIds.length === 0) return []

    const byId = new Map(availableFictions.map((f) => [f.id, f]))

    if (allSelected) {
      if (availableFictions.length > 0) {
        return availableFictions.map((fiction) => ({ kind: "fiction", fiction }))
      }
      const placeholderCount = Math.min(selectedFictionIds.length, 4)
      return Array.from({ length: placeholderCount }, (_, index) => {
        const id = selectedFictionIds[index] ?? `loading-${index}`
        const preview = previewById.get(id)
        return preview ? { kind: "preview", preview } : { kind: "skeleton", id }
      })
    }

    return selectedFictionIds.map((id) => {
      const fiction = byId.get(id)
      if (fiction) return { kind: "fiction", fiction }
      const preview = previewById.get(id)
      if (preview) return { kind: "preview", preview }
      return { kind: "skeleton", id }
    })
  }, [selectedFictionIds, allSelected, availableFictions, previewById])

  const showFictionChips = !isWorld && selectedFictionIds.length > 0

  const scopedFictionTitle = useMemo(() => {
    if (!scopeFictionId) return null
    const fromList = availableFictions.find((f) => f.id === scopeFictionId)
    return (
      fromList?.title ??
      fictionChipPreviews?.find((p) => p.id === scopeFictionId)?.title ??
      null
    )
  }, [scopeFictionId, availableFictions, fictionChipPreviews])

  const activeChipInBar = useMemo(() => {
    if (isWorld || !activeSearchFictionId) return null
    for (const item of fictionChipItems) {
      if (item.kind === "fiction" && item.fiction.id === activeSearchFictionId) {
        return {
          id: item.fiction.id,
          title: item.fiction.title,
          coverSrc: fictionCoverThumbUrl(item.fiction),
          missingXs: !item.fiction.coverImageThumb?.trim(),
        }
      }
      if (item.kind === "preview" && item.preview.id === activeSearchFictionId) {
        return {
          id: item.preview.id,
          title: item.preview.title,
          coverSrc:
            item.preview.coverImageThumb?.trim() || item.preview.coverImage?.trim() || null,
          missingXs: !item.preview.coverImageThumb?.trim(),
        }
      }
    }
    return null
  }, [isWorld, activeSearchFictionId, fictionChipItems])

  const placeholder = useMemo(() => {
    if (isWorld) return tMap("searchFictionOrCityWorld")
    if (isPlaceOnlySearch && scopedFictionTitle) {
      return tMap("searchPlacesInFiction", { fiction: scopedFictionTitle })
    }
    if (searchMode === "multi" && !allSelected) {
      return tMap("searchAnotherFiction")
    }
    return tMap("searchFictionOrCity")
  }, [isWorld, isPlaceOnlySearch, scopedFictionTitle, searchMode, allSelected, tMap])

  const searchHits = useMemo((): MapSearchHit[] => {
    const q = query.toLowerCase()
    if (!q) return []
    if (!isWorld && searchMode === "pick-fiction") return []

    if (isPlaceOnlySearch) {
      return scopedPlaces
        .filter((place) => {
          const name = place.name.toLowerCase()
          const slug = place.slug.toLowerCase()
          const desc = place.description?.toLowerCase() ?? ""
          return name.includes(q) || slug.includes(q) || desc.includes(q)
        })
        .slice(0, MAX_PLACE_HITS)
        .map((place) => ({ kind: "place" as const, place }))
    }

    const cityHits: MapSearchHit[] = cities
      .filter((city) => {
        const name = city.cityName.toLowerCase()
        const country = city.country.toLowerCase()
        return name.includes(q) || country.includes(q)
      })
      .slice(0, MAX_CITY_HITS)
      .map((city) => ({ kind: "city" as const, city }))

    const pairHits: MapSearchHit[] = pairs
      .filter((entry) => {
        const title = entry.fictionTitle.toLowerCase()
        const cityName = entry.cityName.toLowerCase()
        return title.includes(q) || cityName.includes(q)
      })
      .slice(0, MAX_PAIR_HITS)
      .map((entry) => ({ kind: "fiction-city" as const, entry }))

    return [...cityHits, ...pairHits]
  }, [pairs, cities, query, searchMode, isPlaceOnlySearch, scopedPlaces, isWorld])

  async function ensureCatalogLoaded() {
    if (loaded) return
    setLoadFailed(false)
    try {
      const catalog = await getMapSearchCatalogAction()
      setPairs(catalog.fictionCityPairs)
      setCities(catalog.citiesWithPlaces)
      setLoaded(true)
    } catch (err) {
      console.error("getMapSearchCatalogAction failed", err)
      setLoadFailed(true)
    }
  }

  function closeSearch() {
    setIsSearchOpen(false)
    setSearch("")
    setActiveSearchFictionId(null)
  }

  function openSearch() {
    if (!isWorld && searchMode === "pick-fiction") {
      onRequestPickFiction()
      return
    }
    setIsSearchOpen(true)
    void ensureCatalogLoaded()
  }

  function activateFictionChip(fictionId: string) {
    if (activeSearchFictionId === fictionId) {
      closeSearch()
      return
    }
    setActiveSearchFictionId(fictionId)
    setIsSearchOpen(true)
  }

  function handleRemoveFiction(fictionId: string) {
    if (activeSearchFictionId === fictionId) {
      closeSearch()
    }
    onRemoveFiction(fictionId)
  }

  useEffect(() => {
    if (!activeSearchFictionId) return
    const stillVisible =
      allSelected ||
      selectedFictionIds.includes(activeSearchFictionId) ||
      fictionChipPreviews?.some((p) => p.id === activeSearchFictionId)
    if (!stillVisible) {
      setActiveSearchFictionId(null)
      setIsSearchOpen(false)
      setSearch("")
    }
  }, [activeSearchFictionId, allSelected, selectedFictionIds, fictionChipPreviews])

  function handleSelectPlace(place: Place) {
    onSelectPlace(place)
    closeSearch()
  }

  function handleSelectPair(entry: MapFictionCitySearchEntry) {
    onSelectPair(entry)
    closeSearch()
  }

  function handleSelectCity(cityId: string) {
    onSelectCity(cityId)
    closeSearch()
  }

  // World mode: keep the field open so Free World doesn't feel like a locked chip.
  const searchExpanded = isWorld || isSearchOpen

  useEffect(() => {
    if (!isWorld) return
    setIsSearchOpen(true)
    void ensureCatalogLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when entering world
  }, [isWorld])

  useEffect(() => {
    if (!searchExpanded) return
    if (isWorld) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [searchExpanded, isWorld])

  const showDropdown = searchExpanded && query.length > 0

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full", className)}
      onBlur={(event) => {
        if (!isSearchOpen || isWorld) return
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
          closeSearch()
        }
      }}
    >
      <div className={MAP_BAR_CLASS}>
        <SearchScopeChip
          chip={{ label: isWorld ? tMap("freeWorldScope") : selectedCity.name }}
        />

        <div className="relative flex min-w-0 flex-1 items-center overflow-hidden">
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pr-0.5 transition-[flex,opacity,max-width] duration-200 ease-out",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              searchExpanded
                ? "pointer-events-none max-w-0 min-w-0 flex-[0_0_0px] opacity-0"
                : "opacity-100",
            )}
            aria-hidden={searchExpanded}
          >
            {showFictionChips
              ? fictionChipItems.map((item) =>
                  renderFictionChipItem(
                    item,
                    activeSearchFictionId,
                    activateFictionChip,
                    handleRemoveFiction,
                  ),
                )
              : null}
          </div>

          <div
            className={cn(
              "flex min-w-0 items-center gap-2 overflow-hidden transition-[flex,opacity,max-width] duration-200 ease-out",
              searchExpanded
                ? "flex-1 opacity-100"
                : "pointer-events-none max-w-0 min-w-0 flex-[0_0_0px] opacity-0",
            )}
            aria-hidden={!searchExpanded}
          >
            {activeChipInBar ? (
              <FictionMapChip
                title={activeChipInBar.title}
                coverSrc={activeChipInBar.coverSrc}
                fictionId={activeChipInBar.id}
                missingXs={activeChipInBar.missingXs}
                isSelected
                compact
                onSelect={() => closeSearch()}
                onRemove={() => handleRemoveFiction(activeChipInBar.id)}
              />
            ) : null}
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => {
                if (isWorld) void ensureCatalogLoaded()
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault()
                  if (isWorld) {
                    setSearch("")
                    return
                  }
                  closeSearch()
                }
              }}
              placeholder={placeholder}
              tabIndex={searchExpanded ? 0 : -1}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {isWorld ? (
          search.trim() ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={tMap("closeFictionSearch")}
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          ) : null
        ) : isSearchOpen ? (
          <button
            type="button"
            onClick={closeSearch}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={tMap("closeFictionSearch")}
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="button"
            onClick={openSearch}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={
              searchMode === "pick-fiction"
                ? tMap("openFictionPicker")
                : tMap("openFictionSearch")
            }
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
          {loadFailed ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">{tCommon("error")}</div>
          ) : !loaded ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">{tCommon("loading")}</div>
          ) : searchHits.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto p-1">
              {searchHits.map((hit) => {
                const cityPrep = tMap("searchResultCityPreposition")

                if (hit.kind === "city") {
                  const { city } = hit
                  return (
                    <li
                      key={`city:${city.cityId}`}
                      onPointerEnter={() => prefetchCityMapData(city.cityId)}
                    >
                      <MapSearchHitButton
                        typeLabel={tMap("searchResultCity")}
                        media={
                          <span className="flex h-full w-full items-center justify-center text-primary">
                            <MapPin className="h-4 w-4" aria-hidden />
                          </span>
                        }
                        title={city.cityName}
                        subtitle={city.country || null}
                        onSelect={() => handleSelectCity(city.cityId)}
                      />
                    </li>
                  )
                }

                if (hit.kind === "fiction-city") {
                  const { entry } = hit
                  return (
                    <li
                      key={`pair:${entry.fictionId}:${entry.cityId}`}
                      onPointerEnter={() => prefetchCityMapData(entry.cityId)}
                    >
                      <MapSearchHitButton
                        typeLabel={tMap("searchResultFictionCity")}
                        media={
                          <AssetThumbImage
                            src={entry.coverImage || DEFAULT_FICTION_COVER}
                            size={32}
                            ensure={
                              entry.coverImage?.trim()
                                ? {
                                    entityType: "fiction",
                                    entityId: entry.fictionId,
                                    role: "cover",
                                  }
                                : undefined
                            }
                          />
                        }
                        title={entry.fictionTitle}
                        cityPreposition={cityPrep}
                        cityName={entry.cityName}
                        subtitle={entry.country || null}
                        onSelect={() => handleSelectPair(entry)}
                      />
                    </li>
                  )
                }

                const { place } = hit
                const placeImg = place.image?.trim() || DEFAULT_FICTION_COVER
                return (
                  <li key={`place:${place.id}`}>
                    <MapSearchHitButton
                      typeLabel={tMap("searchResultPlace")}
                      media={
                        <AssetThumbImage
                          src={placeImg}
                          size={32}
                          ensure={
                            place.image?.trim()
                              ? {
                                  entityType: "place",
                                  entityId: place.id,
                                  role: "avatar",
                                }
                              : undefined
                          }
                        />
                      }
                      title={place.name.trim() || place.slug}
                      onSelect={() => handleSelectPlace(place)}
                    />
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">{tMap("noMatchingMapSearch")}</div>
          )}
        </div>
      ) : null}
    </div>
  )
}
