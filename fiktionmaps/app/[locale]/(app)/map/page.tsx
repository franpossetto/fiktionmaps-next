"use client"

import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { MapView, Map3DToggleSlot, MapMinimapSlot } from "@/components/map/map-view"
import { MapProvider } from "@/lib/map"
import { CitySelector } from "@/components/map/city-selector"
import { FictionSelector } from "@/components/map/fiction-selector"
import { LocationDetail } from "@/components/map/location-detail"
// import { ThumbnailCarousel } from "@/components/map/thumbnail-carousel"
import { UserMenu } from "@/components/layout/user-menu"
// import { usePlaceSelectorCollapsedStorage } from "@/lib/local-storage-service-hooks"
import { useRouter } from "@/i18n/navigation"
import {
  getAllCitiesAction,
  getCityFictionsAction,
} from "@/src/cities/infrastructure/next/city.actions"
import {
  getPlacesInBboxAction,
  getPlaceLocationAction,
  getCityIdsWithPlacesAction,
  getCityPlacesAction,
} from "@/src/places/infrastructure/next/place.actions"
import { isUuidString } from "@/lib/validation/primitives"

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

const BOUNDS_DEBOUNCE_MS = 300

function resolveSelectedFictionIds(
  fics: FictionWithMedia[],
  preferredFictionId: string | null,
): string[] {
  if (
    preferredFictionId &&
    isUuidString(preferredFictionId) &&
    fics.some((f) => f.id === preferredFictionId)
  ) {
    return [preferredFictionId]
  }
  return fics.map((f) => f.id)
}

function filterPlacesByFictionIds(places: Place[], fictionIds: string[]): Place[] {
  if (fictionIds.length === 0) return []
  const allowed = new Set(fictionIds)
  return places.filter((p) => allowed.has(p.fictionId))
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const tMap = useTranslations("Map")
  const initialFictionId = searchParams.get("fiction")
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
  const cityPlacesRef = useRef<Place[]>([])
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
  const [detailPanelWidth, setDetailPanelWidth] = useState(0)
  const [is3D, setIs3D] = useState(false)
  const [bounds, setBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null)
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [cityIdsWithPlaces, setCityIdsWithPlaces] = useState<string[]>([])
  const [hasAppliedInitialPlaceOpen, setHasAppliedInitialPlaceOpen] = useState(false)
  const debouncedBounds = useDebouncedValue(bounds, BOUNDS_DEBOUNCE_MS)

  const selectedFictionIdsKey = useMemo(
    () => selectedFictionIds.slice().sort().join(","),
    [selectedFictionIds],
  )

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
    const withPlaces = cities.find((c) => cityIdsWithPlaces.includes(c.id))
    if (withPlaces) setSelectedCity(withPlaces)
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
        const city = fromUrl ?? citiesList[0]

        setSelectedCity(city)
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

  useEffect(() => {
    if (!selectedCity) {
      setAvailableFictions([])
      setViewportPlaces([])
      cityPlacesRef.current = []
      return
    }
    let cancelled = false
    const preferredFictionId =
      initialFictionId && isUuidString(initialFictionId) ? initialFictionId : null

    setBounds(null)
    setViewportPlaces([])
    cityPlacesRef.current = []

    Promise.all([
      getCityFictionsAction(selectedCity.id),
      getCityPlacesAction(selectedCity.id),
    ])
      .then(([fics, places]) => {
        if (cancelled) return
        setAvailableFictions(fics)
        const fictionIds = resolveSelectedFictionIds(fics, preferredFictionId)
        setSelectedFictionIds(fictionIds)
        cityPlacesRef.current = places
        setViewportPlaces(filterPlacesByFictionIds(places, fictionIds))
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableFictions([])
          setViewportPlaces([])
          cityPlacesRef.current = []
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedCity?.id, initialFictionId])

  // Fiction filter at city zoom — no extra round-trip.
  useEffect(() => {
    if (!selectedCity || debouncedBounds) return
    setViewportPlaces(filterPlacesByFictionIds(cityPlacesRef.current, selectedFictionIds))
  }, [selectedCity?.id, selectedFictionIdsKey, debouncedBounds])

  // Viewport bbox fetch only after the user pans/zooms (not on first paint).
  useEffect(() => {
    if (!selectedCity || !debouncedBounds) return
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

  const handleCityChange = useCallback((city: City) => {
    setBounds(null)
    setSelectedCity(city)
    setSelectedPlace(null)
    setFocusedPlaceId(null)
    setViewportPlaces([])
  }, [])

  const handleToggleFiction = (fictionId: string) => {
    setSelectedFictionIds((prev) =>
      prev.includes(fictionId) ? prev.filter((id) => id !== fictionId) : [...prev, fictionId],
    )
    setSelectedPlace(null)
    setFocusedPlaceId(null)
  }

  const handleLocationClick = useCallback((place: Place) => {
    setSelectedPlace(place)
    setFocusedPlaceId(place.id)
  }, [])

  // const handleNavigateToPlace = useCallback((place: Place) => {
  //   setFocusedPlaceId(place.id)
  // }, [])

  const handleExplorePlace = useCallback(
    (place: Place) => {
      setSelectedPlace(null)
      const targetFiction = availableFictions.find((fiction) => fiction.id === place.fictionId)
      router.push(
        `/fictions/${encodeURIComponent(targetFiction?.slug ?? place.fictionId)}`,
      )
    },
    [router, availableFictions],
  )

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
            <div className="relative flex w-full items-start px-4 py-4 sm:px-6 lg:px-8">
              <div
                className="pointer-events-auto flex items-center gap-2"
              >
                <FictionSelector
                  availableFictions={availableFictions}
                  selectedFictionIds={selectedFictionIds}
                  onToggleFiction={handleToggleFiction}
                />
              </div>

              <div className="pointer-events-auto ml-auto flex items-center gap-2">
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

          <div className="relative flex-1 min-h-0 w-full">
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
              relatedPlaces={viewportPlaces.filter((p) => p.id !== selectedPlace.id)}
              relatedFictions={availableFictions.filter((f) => f.id !== selectedPlace.fictionId)}
              onClose={() => {
                setSelectedPlace(null)
                setDetailPanelWidth(0)
              }}
              onPanelWidthChange={setDetailPanelWidth}
              onSelectRelatedPlace={handleLocationClick}
              onViewPlace={handleExplorePlace}
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
