"use client"

import { useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Location } from "@/src/locations/domain/location.entity"
import { MapView, Map3DToggleSlot, MapMinimapSlot } from "@/components/map/map-view"
import { MapProvider } from "@/lib/map"
import { CitySelector } from "@/components/map/city-selector"
import { FictionSelector } from "@/components/map/fiction-selector"
import { LocationDetail } from "@/components/map/location-detail"
import { ThumbnailCarousel } from "@/components/map/thumbnail-carousel"
import { usePlaceSelectorCollapsedStorage } from "@/lib/local-storage-service-hooks"
import { useRouter } from "@/i18n/navigation"
import {
  getAllCitiesAction,
  getCityFictionsAction,
} from "@/src/cities/infrastructure/next/city.actions"
import { getPlacesInBboxAction } from "@/src/places/infrastructure/next/place.actions"

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

export default function MapPage() {
  const router = useRouter()
  const [placeSelectorCollapsed, setPlaceSelectorCollapsed] = usePlaceSelectorCollapsedStorage()

  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [availableFictions, setAvailableFictions] = useState<FictionWithMedia[]>([])
  const [selectedFictionIds, setSelectedFictionIds] = useState<string[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null)
  const [is3D, setIs3D] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [bounds, setBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null)
  const [citiesLoading, setCitiesLoading] = useState(true)

  // Load cities from DB, then fictions for first city
  useEffect(() => {
    setCitiesLoading(true)
    getAllCitiesAction()
      .then((citiesList: City[]) => {
        setCities(citiesList)
        if (citiesList.length > 0) {
          const city = citiesList[5]
          setSelectedCity(city)
          return getCityFictionsAction(city.id).then((fics: FictionWithMedia[]) => {
            setAvailableFictions(fics)
            setSelectedFictionIds(fics.map((f) => f.id))
          })
        }
      })
      .catch(() => {})
      .finally(() => setCitiesLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCity || selectedFictionIds.length === 0) {
      setFilteredLocations([])
      return
    }
    const minBbox = bboxAround(selectedCity.lat, selectedCity.lng, MIN_LOAD_RADIUS_KM)
    const bbox = bounds ? bboxUnion(bounds, minBbox) : minBbox
    let cancelled = false
    getPlacesInBboxAction(selectedFictionIds, bbox)
      .then((data) => {
        if (!cancelled) setFilteredLocations(data ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selectedCity?.id, selectedCity?.lat, selectedCity?.lng, selectedFictionIds, bounds])

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
      router.push(
        `/fiction/${encodeURIComponent(location.fictionId)}/place/${encodeURIComponent(location.id)}`,
      )
    },
    [router],
  )

  const isNavigationModeActive = !placeSelectorCollapsed && filteredLocations.length > 0

  useEffect(() => {
    if (!isNavigationModeActive) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputLike =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.getAttribute("contenteditable") === "true"

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

  if (citiesLoading || !selectedCity) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading map…</p>
      </div>
    )
  }

  return (
    <MapProvider>
      <div className="absolute inset-0 min-h-0 flex flex-col">
      <motion.div
        className="absolute left-4 top-4 z-[1000] flex items-center gap-2"
        initial={{ opacity: 0, y: -12 }}
        animate={
          mapLoaded
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: -12 }
        }
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <FictionSelector
          availableFictions={availableFictions}
          selectedFictionIds={selectedFictionIds}
          onToggleFiction={handleToggleFiction}
        />
      </motion.div>

      <motion.div
        className="absolute right-4 top-4 z-[1000] flex items-center gap-2"
        initial={{ opacity: 0, y: -12 }}
        animate={
          mapLoaded
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: -12 }
        }
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
      >
        <Map3DToggleSlot />
        <CitySelector
          cities={cities}
          selectedCity={selectedCity}
          onCityChange={handleCityChange}
        />
      </motion.div>

      <div className="relative flex-1 min-h-0 w-full">
        <MapView
          city={selectedCity}
          locations={filteredLocations}
          onLocationClick={handleLocationClick}
          selectedLocationId={selectedLocation?.id}
          focusLocationId={focusedLocationId}
          is3D={is3D}
          onToggle3D={setIs3D}
          onMapLoaded={() => setMapLoaded(true)}
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
          onClose={() => setSelectedLocation(null)}
          onViewPlace={handleExplorePlace}
        />
      )}

      </div>
    </MapProvider>
  )
}
