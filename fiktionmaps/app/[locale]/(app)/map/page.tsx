"use client"

import { Suspense, useState, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Location } from "@/src/locations/domain/location.entity"
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
import { getPlaceLocationAction, getPlacesInBboxAction } from "@/src/places/infrastructure/next/place.actions"
import { isUuidString } from "@/lib/validation/primitives"

type Bbox = { west: number; south: number; east: number; north: number }

/** Returns a bbox (west, south, east, north) for a ~radiusKm square around lat/lng. */
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

/** Union of two bboxes so the result contains both areas. */
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
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null)
  const [is3D, setIs3D] = useState(false)
  const [bounds, setBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null)
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [hasAppliedInitialPlaceOpen, setHasAppliedInitialPlaceOpen] = useState(false)

  // Load cities, then open city/fictions (optionally from ?city= & ?fiction= when opening from a fiction page)
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
        const city =
          (initialCityId && citiesList.find((c) => c.id === initialCityId)) || citiesList[0]
        setSelectedCity(city)
        // Render map shell as soon as city is known; keep fictions loading in the background.
        setCitiesLoading(false)

        const canPrefillInitialFiction = Boolean(initialFictionId && isUuidString(initialFictionId))
        if (canPrefillInitialFiction) {
          // Optimistic preselection for Explore Map deep links to start loading pins earlier.
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
    // Intentionally only on mount; query is read once for initial state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deep link ?place=: sync focus and ensure the pin is in the list (bbox query can omit it or SSR had no searchParams).
  useEffect(() => {
    if (placeParam && isUuidString(placeParam)) {
      setFocusedLocationId(placeParam)
    }
  }, [placeParam])

  useEffect(() => {
    if (!shouldOpenSidebarFromQuery || hasAppliedInitialPlaceOpen) return
    const deepPlaceId = placeParam && isUuidString(placeParam) ? placeParam : null
    if (!deepPlaceId) {
      setHasAppliedInitialPlaceOpen(true)
      return
    }
    if (selectedLocation?.id === deepPlaceId) {
      setHasAppliedInitialPlaceOpen(true)
      return
    }
    const targetLocation = filteredLocations.find((location) => location.id === deepPlaceId)
    if (!targetLocation) return
    setFocusedLocationId(deepPlaceId)
    setSelectedLocation(targetLocation)
    setHasAppliedInitialPlaceOpen(true)
  }, [
    shouldOpenSidebarFromQuery,
    hasAppliedInitialPlaceOpen,
    placeParam,
    filteredLocations,
    selectedLocation?.id,
  ])

  useEffect(() => {
    if (!selectedCity || selectedFictionIds.length === 0) {
      setFilteredLocations([])
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
        if (!cancelled) setFilteredLocations(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selectedCity?.id, selectedCity?.lat, selectedCity?.lng, selectedFictionIds, bounds, placeParam])

  const handleCityChange = useCallback(async (city: City) => {
    setSelectedCity(city)
    setSelectedLocation(null)
    setFocusedLocationId(null)
    const fics = await getCityFictionsAction(city.id)
    setAvailableFictions(fics)
    setSelectedFictionIds(fics.map((f) => f.id))
  }, [])

  const handleToggleFiction = (fictionId: string) => {
    setSelectedFictionIds((prev) =>
      prev.includes(fictionId) ? prev.filter((id) => id !== fictionId) : [...prev, fictionId],
    )
    setSelectedLocation(null)
    setFocusedLocationId(null)
  }

  const handleLocationClick = useCallback((location: Location) => {
    setSelectedLocation(location)
    setFocusedLocationId(location.id)
  }, [])

  /** Navigate map to place (from carousel) without opening sidebar. */
  const handleNavigateToPlace = useCallback((location: Location) => {
    setFocusedLocationId(location.id)
  }, [])

  const handleExplorePlace = useCallback(
    (location: Location) => {
      setSelectedLocation(null)
      const targetFiction = availableFictions.find((fiction) => fiction.id === location.fictionId)
      router.push(
        `/fictions/${encodeURIComponent(targetFiction?.slug ?? location.fictionId)}`,
      )
    },
    [router, availableFictions],
  )

  const isNavigationModeActive = !placeSelectorCollapsed && filteredLocations.length > 0

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
        if (focusedLocationId && !selectedLocation) {
          const loc = filteredLocations.find((l) => l.id === focusedLocationId)
          if (loc) {
            e.preventDefault()
            setSelectedLocation(loc)
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        if (selectedLocation) {
          setSelectedLocation(null)
        } else {
          setPlaceSelectorCollapsed(true)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    isNavigationModeActive,
    focusedLocationId,
    selectedLocation,
    filteredLocations,
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
                <CitySelector
                  cities={cities}
                  selectedCity={selectedCity}
                  onCityChange={handleCityChange}
                />
                <Map3DToggleSlot />
                <div className="rounded-xl border border-border bg-background shadow-sm">
                  <UserMenu />
                </div>
              </div>
            </div>
          </header>

          <div className="relative flex-1 min-h-0 w-full">
            <MapView
              city={selectedCity}
              locations={filteredLocations}
              onLocationClick={handleLocationClick}
              selectedLocationId={selectedLocation?.id}
              focusLocationId={focusedLocationId}
              is3D={is3D}
              onToggle3D={setIs3D}
              onBoundsChange={setBounds}
            />
          </div>

          <MapMinimapSlot />

          <ThumbnailCarousel
            locations={filteredLocations}
            selectedLocationId={focusedLocationId ?? selectedLocation?.id}
            onLocationClick={handleNavigateToPlace}
            placeSelectorCollapsed={placeSelectorCollapsed}
            setPlaceSelectorCollapsed={setPlaceSelectorCollapsed}
          />

          {selectedLocation && (
            <LocationDetail
              location={selectedLocation}
              fiction={availableFictions.find((f) => f.id === selectedLocation.fictionId)}
              relatedLocations={filteredLocations.filter((l) => l.id !== selectedLocation.id)}
              relatedFictions={availableFictions.filter((f) => f.id !== selectedLocation.fictionId)}
              onClose={() => setSelectedLocation(null)}
              onSelectRelatedLocation={handleLocationClick}
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
