"use client"

import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { Loader2 } from "lucide-react"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { MapFictionCitySearchEntry } from "@/src/places/domain/map-fiction-city-pair.entity"
import { MapView, Map3DToggleSlot, MapMinimapSlot } from "@/components/map/map-view"
import { MapProvider } from "@/lib/map"
import {
  loadCityFictions,
  loadCityPlaces,
  getCachedCityMapData,
  getCachedCityPlaces,
  getCachedCityFictions,
} from "@/lib/map/city-map-data-cache"
import {
  buildMapQueryString,
  isAllFictionsSelected,
  MAP_FICTION_NONE,
  parseFictionIdsFromUrl,
} from "@/lib/map/map-url"
import { CitySelector } from "@/components/map/city-selector"
import { FictionSelector } from "@/components/map/fiction-selector"
import { MapFictionCitySearch } from "@/components/map/map-fiction-city-search"
import { LocationDetail } from "@/components/map/location-detail"
import { UserMenu } from "@/components/layout/user-menu"
// import { usePlaceSelectorCollapsedStorage } from "@/lib/local-storage-service-hooks"
import { getAllCitiesAction } from "@/src/cities/infrastructure/next/city.actions"
import {
  getPlacesInBboxAction,
  getPlaceLocationAction,
  getCityIdsWithPlacesAction,
} from "@/src/places/infrastructure/next/place.actions"
import { isUuidString } from "@/lib/validation/primitives"

/** Debounce non-null bounds; null clears immediately so city switches never keep a stale bbox. */
function useDebouncedBounds(
  value: { west: number; south: number; east: number; north: number } | null,
  delayMs: number,
): { west: number; south: number; east: number; north: number } | null {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    if (value === null) {
      setDebounced(null)
      return
    }
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

const BOUNDS_DEBOUNCE_MS = 300

function filterPlacesByFictionIds(places: Place[], fictionIds: string[]): Place[] {
  if (fictionIds.length === 0) return []
  const allowed = new Set(fictionIds)
  return places.filter((p) => allowed.has(p.fictionId))
}

function uniqueFictionIdsFromPlaces(places: Place[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const place of places) {
    if (seen.has(place.fictionId)) continue
    seen.add(place.fictionId)
    ids.push(place.fictionId)
  }
  return ids
}

function parseFictionIdsFromParam(param: string | null): string[] | null {
  if (param === MAP_FICTION_NONE) return []
  if (!param?.trim()) return null
  const ids = param
    .split(",")
    .map((s) => s.trim())
    .filter((id) => isUuidString(id))
  return ids.length > 0 ? ids : null
}

function pickRandomCity(cities: City[]): City {
  return cities[Math.floor(Math.random() * cities.length)]
}

function MapLoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-background">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

function MapPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tMap = useTranslations("Map")
  const fictionParam = searchParams.get("fiction")
  const initialCityId = searchParams.get("city")
  const placeParam = searchParams.get("place")
  const shouldOpenSidebarFromQuery =
    searchParams.get("openSidebar") === "true" || searchParams.get("openSidebar") === "1"
  // const [placeSelectorCollapsed, setPlaceSelectorCollapsed] = usePlaceSelectorCollapsedStorage()

  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [availableFictions, setAvailableFictions] = useState<FictionWithMedia[]>([])
  const [selectedFictionIds, setSelectedFictionIds] = useState<string[]>([])
  const [viewportPlaces, setViewportPlaces] = useState<Place[]>([])
  /** Full city place list — stable source for sidebar “next places”, independent of map bbox. */
  const [cityPlaces, setCityPlaces] = useState<Place[]>([])
  const cityPlacesRef = useRef<Place[]>([])
  /** Applied on next city data load so URL + fiction filter stay in sync after search. */
  const pendingFictionIdsRef = useRef<string[] | null>(null)
  /** Plain city change (selector / city hit): select all fictions in the new city, ignore stale URL fiction. */
  const selectAllFictionsOnCityLoadRef = useRef(false)
  /** Optimistic chip labels/covers from search until city fictions load. */
  const [fictionChipPreviews, setFictionChipPreviews] = useState<
    { id: string; title: string; coverImage: string | null; coverImageThumb?: string | null }[] | null
  >(null)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
  const [detailPanelWidth, setDetailPanelWidth] = useState(0)
  const [is3D, setIs3D] = useState(false)
  const [bounds, setBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null)
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [cityIdsWithPlaces, setCityIdsWithPlaces] = useState<string[]>([])
  const [hasAppliedInitialPlaceOpen, setHasAppliedInitialPlaceOpen] = useState(false)
  const [fictionSelectorOpen, setFictionSelectorOpen] = useState(false)
  const debouncedBounds = useDebouncedBounds(bounds, BOUNDS_DEBOUNCE_MS)
  const selectedCityId = selectedCity?.id ?? null
  /** Blocks bbox fetches / fiction-filter wipes while a city load is in flight. */
  const cityDataReadyRef = useRef(false)

  const selectedFictionIdsKey = useMemo(
    () => selectedFictionIds.slice().sort().join(","),
    [selectedFictionIds],
  )

  const sidebarRelatedPlaces = useMemo(() => {
    if (!selectedPlace) return []
    return filterPlacesByFictionIds(cityPlaces, selectedFictionIds).filter(
      (p) => p.id !== selectedPlace.id,
    )
  }, [cityPlaces, selectedFictionIds, selectedPlace?.id])

  const isBootstrapping = citiesLoading || !selectedCity

  const loadingMessage = tMap("loadingMap")

  // City picker hints only — must not block first paint (full-table scan).
  useEffect(() => {
    let cancelled = false
    getCityIdsWithPlacesAction()
      .then((ids) => {
        if (!cancelled) setCityIdsWithPlaces(ids)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // If the default city has no places, switch once hints arrive (does not block first paint).
  useEffect(() => {
    if (!selectedCity || cityIdsWithPlaces.length === 0 || cities.length === 0) return
    if (cityIdsWithPlaces.includes(selectedCity.id)) return
    const citiesWithPlaces = cities.filter((c) => cityIdsWithPlaces.includes(c.id))
    if (citiesWithPlaces.length > 0) setSelectedCity(pickRandomCity(citiesWithPlaces))
  }, [cityIdsWithPlaces, cities, selectedCity])

  useEffect(() => {
    setCitiesLoading(true)
    let cancelled = false
    getAllCitiesAction()
      .then((citiesList: City[]) => {
        if (cancelled) return
        setCities(citiesList)
        if (citiesList.length === 0) {
          setCitiesLoading(false)
          return
        }
        const fromUrl = initialCityId
          ? citiesList.find((c) => c.id === initialCityId)
          : undefined
        setSelectedCity(fromUrl ?? pickRandomCity(citiesList))
        setCitiesLoading(false)
      })
      .catch(() => {
        if (!cancelled) setCitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync city FROM the URL only when the URL city changes (back/forward / deep link).
  // Do not depend on selectedCityId — handlers update state before Next propagates searchParams,
  // and depending on both caused B→A→B bounce.
  useEffect(() => {
    if (cities.length === 0) return
    const fromUrl = initialCityId
      ? cities.find((c) => c.id === initialCityId)
      : undefined

    if (fromUrl) {
      setSelectedCity((prev) => {
        if (prev?.id === fromUrl.id) return prev
        // URL-driven navigation (back/forward): honor fiction query, don't force select-all.
        selectAllFictionsOnCityLoadRef.current = false
        return fromUrl
      })
      return
    }

    setSelectedCity((prev) => prev ?? pickRandomCity(cities))
  }, [cities, initialCityId])

  useEffect(() => {
    if (!selectedCity) {
      cityDataReadyRef.current = false
      setAvailableFictions([])
      setViewportPlaces([])
      setCityPlaces([])
      cityPlacesRef.current = []
      return
    }
    let cancelled = false
    const cityId = selectedCity.id
    const pendingSnapshot = pendingFictionIdsRef.current
    const selectAllOnLoad = selectAllFictionsOnCityLoadRef.current
    cityDataReadyRef.current = false
    setBounds(null)

    if (pendingSnapshot?.length) {
      setSelectedFictionIds(pendingSnapshot)
    } else {
      setAvailableFictions([])
      setSelectedFictionIds([])
      setFictionChipPreviews(null)
    }

    const applyPlaces = (places: Place[]) => {
      cityPlacesRef.current = places
      cityDataReadyRef.current = true
      setCityPlaces(places)

      if (pendingSnapshot?.length) {
        setViewportPlaces(filterPlacesByFictionIds(places, pendingSnapshot))
        return
      }
      if (selectAllOnLoad) {
        setSelectedFictionIds(uniqueFictionIdsFromPlaces(places))
        setViewportPlaces(places)
        return
      }
      const fromUrl = parseFictionIdsFromParam(fictionParam)
      if (fromUrl) {
        setSelectedFictionIds(fromUrl)
        setViewportPlaces(filterPlacesByFictionIds(places, fromUrl))
        return
      }
      setSelectedFictionIds(uniqueFictionIdsFromPlaces(places))
      setViewportPlaces(places)
    }

    const applyFictions = (fics: FictionWithMedia[]) => {
      if (pendingSnapshot) pendingFictionIdsRef.current = null
      setFictionChipPreviews(null)
      const validPending =
        pendingSnapshot?.filter((id) => fics.some((f) => f.id === id)) ?? []
      if (selectAllOnLoad) selectAllFictionsOnCityLoadRef.current = false
      const fictionIds =
        validPending.length > 0
          ? validPending
          : selectAllOnLoad
            ? fics.map((f) => f.id)
            : parseFictionIdsFromUrl(fictionParam, fics)
      setAvailableFictions(fics)
      setSelectedFictionIds(fictionIds)
      if (cityPlacesRef.current.length > 0) {
        setViewportPlaces(filterPlacesByFictionIds(cityPlacesRef.current, fictionIds))
      }
    }

    // Instant paint when this city was visited or prefetched.
    const cached = getCachedCityMapData(cityId)
    if (cached) {
      applyPlaces(cached.places)
      applyFictions(cached.fictions)
      return
    }

    // Progressive: pins as soon as places resolve (don't wait on fictions).
    const cachedPlaces = getCachedCityPlaces(cityId)
    if (cachedPlaces) applyPlaces(cachedPlaces)
    else {
      cityPlacesRef.current = []
      setViewportPlaces([])
      setCityPlaces([])
    }

    const cachedFictions = getCachedCityFictions(cityId)
    if (cachedFictions) applyFictions(cachedFictions)

    if (!cachedPlaces) {
      loadCityPlaces(cityId)
        .then((places) => {
          if (!cancelled) applyPlaces(places)
        })
        .catch(() => {
          if (!cancelled) {
            cityDataReadyRef.current = true
            setViewportPlaces([])
            setCityPlaces([])
            cityPlacesRef.current = []
          }
        })
    }

    if (!cachedFictions) {
      loadCityFictions(cityId)
        .then((fics) => {
          if (!cancelled) applyFictions(fics)
        })
        .catch(() => {
          if (!cancelled) {
            pendingFictionIdsRef.current = null
            setFictionChipPreviews(null)
            setAvailableFictions([])
          }
        })
    }

    return () => {
      cancelled = true
    }
    // Fiction filter from URL is applied here on city load; in-session changes use applyFictionSelection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity?.id])

  // Fiction filter at city zoom — no extra round-trip.
  useEffect(() => {
    if (!selectedCity || debouncedBounds) return
    if (!cityDataReadyRef.current || cityPlacesRef.current.length === 0) return
    setViewportPlaces(filterPlacesByFictionIds(cityPlacesRef.current, selectedFictionIds))
  }, [selectedCity?.id, selectedFictionIdsKey, debouncedBounds])

  // Viewport bbox fetch only after the user pans/zooms (not on first paint / city flyTo).
  useEffect(() => {
    if (!selectedCity || !debouncedBounds) return
    if (!cityDataReadyRef.current) return
    if (selectedFictionIds.length === 0) {
      setViewportPlaces([])
      return
    }

    const deepPlaceId = placeParam && isUuidString(placeParam) ? placeParam : null
    let cancelled = false

    getPlacesInBboxAction(selectedFictionIds, debouncedBounds)
      .then(async (data) => {
        if (cancelled) return
        let list = data ?? []
        if (deepPlaceId && !list.some((place) => place.id === deepPlaceId)) {
          const loc = await getPlaceLocationAction(deepPlaceId)
          if (cancelled) return
          if (loc) list = [...list, loc]
        }
        setViewportPlaces(list)
      })
      .catch(() => {
        if (!cancelled) setViewportPlaces([])
      })

    return () => {
      cancelled = true
    }
  }, [selectedCity?.id, selectedFictionIdsKey, debouncedBounds, placeParam])

  useEffect(() => {
    if (placeParam && isUuidString(placeParam)) {
      setFocusedPlaceId(placeParam)
    }
  }, [placeParam])

  useEffect(() => {
    if (!shouldOpenSidebarFromQuery || hasAppliedInitialPlaceOpen) return
    const deepPlaceId = placeParam && isUuidString(placeParam) ? placeParam : null
    if (!deepPlaceId) {
      setHasAppliedInitialPlaceOpen(true)
      return
    }
    if (selectedPlace?.id === deepPlaceId) {
      setHasAppliedInitialPlaceOpen(true)
      return
    }
    const targetPlace = viewportPlaces.find((p) => p.id === deepPlaceId)
    if (!targetPlace) return
    setFocusedPlaceId(deepPlaceId)
    setSelectedPlace(targetPlace)
    setHasAppliedInitialPlaceOpen(true)
  }, [
    shouldOpenSidebarFromQuery,
    hasAppliedInitialPlaceOpen,
    placeParam,
    viewportPlaces,
    selectedPlace?.id,
  ])

  const handleCityChange = useCallback(
    (city: City) => {
      if (city.id === selectedCityId) return
      pendingFictionIdsRef.current = null
      selectAllFictionsOnCityLoadRef.current = true
      setFictionChipPreviews(null)
      setAvailableFictions([])
      setSelectedFictionIds([])
      router.replace(`${pathname}?city=${encodeURIComponent(city.id)}`)
      setBounds(null)
      setSelectedCity(city)
      setSelectedPlace(null)
      setFocusedPlaceId(null)
    },
    [router, pathname, selectedCityId],
  )

  const applyFictionSelection = useCallback(
    (next: string[]) => {
      if (!selectedCity) return
      setFictionChipPreviews(null)
      setSelectedFictionIds(next)
      setViewportPlaces(filterPlacesByFictionIds(cityPlacesRef.current, next))
      if (availableFictions.length > 0) {
        const qs = buildMapQueryString(selectedCity.id, next, availableFictions, {
          place: searchParams.get("place"),
          openSidebar: searchParams.get("openSidebar"),
        })
        router.replace(`${pathname}?${qs}`)
      }
      setSelectedPlace(null)
      setFocusedPlaceId(null)
    },
    [selectedCity, availableFictions, router, pathname, searchParams],
  )

  const handleApplySearchPair = useCallback(
    (entry: MapFictionCitySearchEntry) => {
      const sameCity = selectedCity?.id === entry.cityId

      if (sameCity && availableFictions.length > 0) {
        const prev = selectedFictionIds
        const allSelected = isAllFictionsSelected(prev, availableFictions)
        let next: string[]
        if (allSelected) {
          next = [entry.fictionId]
        } else if (prev.includes(entry.fictionId)) {
          next = prev
        } else {
          next = [...prev, entry.fictionId]
        }
        applyFictionSelection(next)
        return
      }

      pendingFictionIdsRef.current = [entry.fictionId]
      setFictionChipPreviews([
        {
          id: entry.fictionId,
          title: entry.fictionTitle,
          coverImage: entry.coverImage,
        },
      ])
      setSelectedFictionIds([entry.fictionId])
      setAvailableFictions([])

      const city = cities.find((c) => c.id === entry.cityId)
      if (city) {
        setBounds(null)
        setSelectedCity(city)
        setSelectedPlace(null)
        setFocusedPlaceId(null)
      }

      const params = new URLSearchParams()
      params.set("city", entry.cityId)
      params.set("fiction", entry.fictionId)
      router.replace(`${pathname}?${params.toString()}`)
    },
    [selectedCity?.id, selectedFictionIds, availableFictions, cities, router, pathname, applyFictionSelection],
  )

  const handleSelectCityFromSearch = useCallback(
    (cityId: string) => {
      if (cityId === selectedCityId) return
      pendingFictionIdsRef.current = null
      selectAllFictionsOnCityLoadRef.current = true
      setFictionChipPreviews(null)
      setAvailableFictions([])
      setSelectedFictionIds([])
      const city = cities.find((c) => c.id === cityId)
      if (!city) return
      router.replace(`${pathname}?city=${encodeURIComponent(city.id)}`)
      setBounds(null)
      setSelectedCity(city)
      setSelectedPlace(null)
      setFocusedPlaceId(null)
    },
    [cities, router, pathname, selectedCityId],
  )

  const handleRemoveFiction = useCallback(
    (fictionId: string) => {
      if (!selectedCity || availableFictions.length === 0) return
      const next = selectedFictionIds.filter((id) => id !== fictionId)
      applyFictionSelection(next)
    },
    [selectedCity, availableFictions, selectedFictionIds, applyFictionSelection],
  )

  const handleToggleFiction = useCallback(
    (fictionId: string) => {
      if (!selectedCity) return
      const next = selectedFictionIds.includes(fictionId)
        ? selectedFictionIds.filter((id) => id !== fictionId)
        : [...selectedFictionIds, fictionId]
      applyFictionSelection(next)
    },
    [selectedCity, selectedFictionIds, applyFictionSelection],
  )

  const handleLocationClick = useCallback((place: Place) => {
    setSelectedPlace(place)
    setFocusedPlaceId(place.id)
    setViewportPlaces((prev) =>
      prev.some((p) => p.id === place.id) ? prev : [...prev, place],
    )
  }, [])

  // const handleNavigateToPlace = useCallback((place: Place) => {
  //   setFocusedPlaceId(place.id)
  // }, [])

  // Modo navegación (carrusel inferior): oculto por ahora — reactivar con ThumbnailCarousel + estado arriba.
  // const isNavigationModeActive = !placeSelectorCollapsed && filteredPlaces.length > 0
  //
  // useEffect(() => {
  //   if (!isNavigationModeActive) return
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     const target = e.target
  //     const isHTMLElement = target instanceof HTMLElement
  //     const isInputLike =
  //       isHTMLElement &&
  //       (target.tagName === "INPUT" ||
  //         target.tagName === "TEXTAREA" ||
  //         target.getAttribute("contenteditable") === "true")
  //
  //     if (e.key === "Enter" || e.key === " ") {
  //       if (isInputLike) return
  //       if (focusedPlaceId && !selectedPlace) {
  //         const p = filteredPlaces.find((x) => x.id === focusedPlaceId)
  //         if (p) {
  //           e.preventDefault()
  //           setSelectedPlace(p)
  //         }
  //       }
  //     } else if (e.key === "Escape") {
  //       e.preventDefault()
  //       if (selectedPlace) {
  //         setSelectedPlace(null)
  //       } else {
  //         setPlaceSelectorCollapsed(true)
  //       }
  //     }
  //   }
  //   window.addEventListener("keydown", handleKeyDown)
  //   return () => window.removeEventListener("keydown", handleKeyDown)
  // }, [
  //   isNavigationModeActive,
  //   focusedPlaceId,
  //   selectedPlace,
  //   filteredPlaces,
  //   setPlaceSelectorCollapsed,
  // ])

  return (
    <MapProvider>
      {isBootstrapping ? (
        <MapLoadingScreen message={loadingMessage} />
      ) : (
        <div className="absolute inset-0 min-h-0 flex flex-col">
          <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000]">
            <div className="relative flex w-full items-start justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 md:grid md:grid-cols-[1fr_minmax(280px,520px)_1fr] md:gap-4 lg:px-8">
              <div className="pointer-events-auto flex min-w-0 items-center gap-2 md:justify-self-start">
                <FictionSelector
                  availableFictions={availableFictions}
                  selectedFictionIds={selectedFictionIds}
                  onToggleFiction={handleToggleFiction}
                  open={fictionSelectorOpen}
                  onOpenChange={setFictionSelectorOpen}
                />
              </div>

              <div className="pointer-events-auto relative hidden w-full min-w-0 justify-self-center md:block">
                <MapFictionCitySearch
                  selectedCity={selectedCity}
                  availableFictions={availableFictions}
                  selectedFictionIds={selectedFictionIds}
                  fictionChipPreviews={fictionChipPreviews}
                  cityPlaces={cityPlaces}
                  onSelectPair={handleApplySearchPair}
                  onSelectCity={handleSelectCityFromSearch}
                  onSelectPlace={handleLocationClick}
                  onRemoveFiction={handleRemoveFiction}
                  onRequestPickFiction={() => setFictionSelectorOpen(true)}
                />
              </div>

              <div className="pointer-events-auto flex items-center gap-2 justify-self-end">
                <Map3DToggleSlot />
                <CitySelector
                  cities={cities}
                  selectedCity={selectedCity}
                  onCityChange={handleCityChange}
                  cityIdsWithPlaces={cityIdsWithPlaces}
                  cityWithoutPlacesHint={tMap("cityWithoutPlaces")}
                />
                <div className="rounded-xl border border-border bg-background shadow-sm">
                  <UserMenu />
                </div>
              </div>
            </div>
          </header>

          <div className="relative z-0 flex-1 min-h-0 w-full">
            <MapView
              city={selectedCity}
              places={viewportPlaces}
              onLocationClick={handleLocationClick}
              selectedLocationId={selectedPlace?.id}
              focusLocationId={focusedPlaceId}
              focusPaddingRight={detailPanelWidth}
              is3D={is3D}
              onToggle3D={setIs3D}
              onBoundsChange={setBounds}
            />
          </div>

          <MapMinimapSlot />

          {/*
          <ThumbnailCarousel
            places={filteredPlaces}
            selectedLocationId={focusedPlaceId ?? selectedPlace?.id}
            onLocationClick={handleNavigateToPlace}
            placeSelectorCollapsed={placeSelectorCollapsed}
            setPlaceSelectorCollapsed={setPlaceSelectorCollapsed}
          />
          */}

          {selectedPlace && (
            <LocationDetail
              place={selectedPlace}
              fiction={availableFictions.find((f) => f.id === selectedPlace.fictionId)}
              relatedPlaces={sidebarRelatedPlaces}
              relatedFictions={availableFictions.filter((f) => f.id !== selectedPlace.fictionId)}
              onClose={() => {
                setSelectedPlace(null)
                setDetailPanelWidth(0)
              }}
              onPanelWidthChange={setDetailPanelWidth}
              onSelectRelatedPlace={handleLocationClick}
            />
          )}
        </div>
      )}
    </MapProvider>
  )
}

function MapPageFallback() {
  const tMap = useTranslations("Map")
  return <MapLoadingScreen message={tMap("loadingMap")} />
}

export default function MapPage() {
  return (
    <Suspense fallback={<MapPageFallback />}>
      <MapPageInner />
    </Suspense>
  )
}
