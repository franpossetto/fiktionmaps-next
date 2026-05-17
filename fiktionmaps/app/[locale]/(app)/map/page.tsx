"use client"

import { Suspense, useState, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { MapView, Map3DToggleSlot, MapMinimapSlot } from "@/components/map/map-view"
import { MapProvider } from "@/lib/map"
import { CitySelector } from "@/components/map/city-selector"
import { FictionSelector } from "@/components/map/fiction-selector"
import { LocationDetail } from "@/components/map/location-detail"
import { ThumbnailCarousel } from "@/components/map/thumbnail-carousel"
import { UserMenu } from "@/components/layout/user-menu"
import { usePlaceSelectorCollapsedStorage } from "@/lib/local-storage-service-hooks"
import { useRouter } from "@/i18n/navigation"
import {
  getAllCitiesAction,
  getCityFictionsAction,
} from "@/src/cities/infrastructure/next/city.actions"
import { getPlaceLocationAction, getPlacesInBboxAction, getCityIdsWithPlacesAction } from "@/src/places/infrastructure/next/place.actions"
import { isUuidString } from "@/lib/validation/primitives"

type Bbox = { west: number; south: number; east: number; north: number }

function bboxAround(lat: number, lng: number, radiusKm: number): Bbox {
  const kmPerDegLat = 111.32
  const deltaLat = radiusKm / kmPerDegLat
  const deltaLng = radiusKm / (kmPerDegLat * Math.cos((lat * Math.PI) / 180))
  return {
    west: lng - deltaLng,
    south: lat - deltaLat,
    east: lng + deltaLng,
    north: lat + deltaLat,
  }
}

function bboxUnion(a: Bbox, b: Bbox): Bbox {
  return {
    west: Math.min(a.west, b.west),
    south: Math.min(a.south, b.south),
    east: Math.max(a.east, b.east),
    north: Math.max(a.north, b.north),
  }
}

const MIN_LOAD_RADIUS_KM = 50

function MapPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tMap = useTranslations("Map")
  const initialFictionId = searchParams.get("fiction")
  const initialCityId = searchParams.get("city")
  const placeParam = searchParams.get("place")
  const shouldOpenSidebarFromQuery =
    searchParams.get("openSidebar") === "true" || searchParams.get("openSidebar") === "1"
  const [placeSelectorCollapsed, setPlaceSelectorCollapsed] = usePlaceSelectorCollapsedStorage()

  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [availableFictions, setAvailableFictions] = useState<FictionWithMedia[]>([])
  const [selectedFictionIds, setSelectedFictionIds] = useState<string[]>([])
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([])
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
  const [is3D, setIs3D] = useState(false)
  const [bounds, setBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null)
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [cityIdsWithPlaces, setCityIdsWithPlaces] = useState<string[]>([])
  const [hasAppliedInitialPlaceOpen, setHasAppliedInitialPlaceOpen] = useState(false)

  useEffect(() => {
    setCitiesLoading(true)
    let cancelled = false
    Promise.all([getAllCitiesAction(), getCityIdsWithPlacesAction()])
      .then(([citiesList, withPlacesIds]: [City[], string[]]) => {
        if (cancelled) return
        setCities(citiesList)
        setCityIdsWithPlaces(withPlacesIds)
        if (citiesList.length === 0) {
          setCitiesLoading(false)
          return
        }
        const withPlacesSet = new Set(withPlacesIds)
        const fromUrl = initialCityId
          ? citiesList.find((c) => c.id === initialCityId)
          : undefined
        const city =
          fromUrl ??
          citiesList.find((c) => withPlacesSet.has(c.id)) ??
          citiesList[0]
        setSelectedCity(city)
        setCitiesLoading(false)

        const canPrefillInitialFiction = Boolean(initialFictionId && isUuidString(initialFictionId))
        if (canPrefillInitialFiction) {
          setSelectedFictionIds([initialFictionId!])
        }

        return getCityFictionsAction(city.id).then((fics: FictionWithMedia[]) => {
          if (cancelled) return
          setAvailableFictions(fics)
          if (initialFictionId && fics.some((f) => f.id === initialFictionId)) {
            setSelectedFictionIds([initialFictionId])
          } else {
            setSelectedFictionIds(fics.map((f) => f.id))
          }
        })
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
    const targetPlace = filteredPlaces.find((p) => p.id === deepPlaceId)
    if (!targetPlace) return
    setFocusedPlaceId(deepPlaceId)
    setSelectedPlace(targetPlace)
    setHasAppliedInitialPlaceOpen(true)
  }, [
    shouldOpenSidebarFromQuery,
    hasAppliedInitialPlaceOpen,
    placeParam,
    filteredPlaces,
    selectedPlace?.id,
  ])

  useEffect(() => {
    if (!selectedCity || selectedFictionIds.length === 0) {
      setFilteredPlaces([])
      return
    }
    const minBbox = bboxAround(selectedCity.lat, selectedCity.lng, MIN_LOAD_RADIUS_KM)
    const bbox = bounds ? bboxUnion(bounds, minBbox) : minBbox
    const deepPlaceId = placeParam && isUuidString(placeParam) ? placeParam : null
    let cancelled = false
    getPlacesInBboxAction(selectedFictionIds, bbox)
      .then(async (data) => {
        if (cancelled) return
        let list = data ?? []
        if (deepPlaceId && !list.some((l) => l.id === deepPlaceId)) {
          const loc = await getPlaceLocationAction(deepPlaceId)
          if (cancelled) return
          if (loc) list = [...list, loc]
        }
        if (!cancelled) setFilteredPlaces(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selectedCity?.id, selectedCity?.lat, selectedCity?.lng, selectedFictionIds, bounds, placeParam])

  const handleCityChange = useCallback(async (city: City) => {
    setSelectedCity(city)
    setSelectedPlace(null)
    setFocusedPlaceId(null)
    const fics = await getCityFictionsAction(city.id)
    setAvailableFictions(fics)
    setSelectedFictionIds(fics.map((f) => f.id))
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

  const handleNavigateToPlace = useCallback((place: Place) => {
    setFocusedPlaceId(place.id)
  }, [])

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

  const isNavigationModeActive = !placeSelectorCollapsed && filteredPlaces.length > 0

  useEffect(() => {
    if (!isNavigationModeActive) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target
      const isHTMLElement = target instanceof HTMLElement
      const isInputLike =
        isHTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true")

      if (e.key === "Enter" || e.key === " ") {
        if (isInputLike) return
        if (focusedPlaceId && !selectedPlace) {
          const p = filteredPlaces.find((x) => x.id === focusedPlaceId)
          if (p) {
            e.preventDefault()
            setSelectedPlace(p)
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        if (selectedPlace) {
          setSelectedPlace(null)
        } else {
          setPlaceSelectorCollapsed(true)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    isNavigationModeActive,
    focusedPlaceId,
    selectedPlace,
    filteredPlaces,
    setPlaceSelectorCollapsed,
  ])

  return (
    <MapProvider>
      {citiesLoading || !selectedCity ? (
        <div className="flex min-h-full items-center justify-center bg-background">
          <p className="text-muted-foreground">{tMap("loadingMap")}</p>
        </div>
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
              places={filteredPlaces}
              onLocationClick={handleLocationClick}
              selectedLocationId={selectedPlace?.id}
              focusLocationId={focusedPlaceId}
              is3D={is3D}
              onToggle3D={setIs3D}
              onBoundsChange={setBounds}
            />
          </div>

          <MapMinimapSlot />

          <ThumbnailCarousel
            places={filteredPlaces}
            selectedLocationId={focusedPlaceId ?? selectedPlace?.id}
            onLocationClick={handleNavigateToPlace}
            placeSelectorCollapsed={placeSelectorCollapsed}
            setPlaceSelectorCollapsed={setPlaceSelectorCollapsed}
          />

          {selectedPlace && (
            <LocationDetail
              place={selectedPlace}
              fiction={availableFictions.find((f) => f.id === selectedPlace.fictionId)}
              relatedPlaces={filteredPlaces.filter((p) => p.id !== selectedPlace.id)}
              relatedFictions={availableFictions.filter((f) => f.id !== selectedPlace.fictionId)}
              onClose={() => setSelectedPlace(null)}
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
  return (
    <div className="flex min-h-full items-center justify-center bg-background">
      <p className="text-muted-foreground">{tMap("loadingMap")}</p>
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={<MapPageFallback />}>
      <MapPageInner />
    </Suspense>
  )
}
