"use client"

import { useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import type { City } from "@/src/cities/city.domain"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"
import type { Location } from "@/src/locations"
import { useApi } from "@/lib/api"
import { MapView, Map3DToggleSlot, MapMinimapSlot } from "@/components/map/map-view"
import { MapProvider } from "@/lib/map"
import { CitySelector } from "@/components/map/city-selector"
import { FictionSelector } from "@/components/map/fiction-selector"
import { LocationDetail } from "@/components/map/location-detail"
import { ThumbnailCarousel } from "@/components/map/thumbnail-carousel"
import { PlacePage } from "@/components/map/place-page"
import { usePlaceSelectorCollapsedStorage } from "@/lib/local-storage-service-hooks"

export default function MapPage() {
  const { cities: citiesService, locations: locationsService } = useApi()
  const [placeSelectorCollapsed, setPlaceSelectorCollapsed] = usePlaceSelectorCollapsedStorage()

  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [availableFictions, setAvailableFictions] = useState<FictionWithMedia[]>([])
  const [selectedFictionIds, setSelectedFictionIds] = useState<string[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null)
  const [placePageLocation, setPlacePageLocation] = useState<Location | null>(null)
  const [is3D, setIs3D] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    citiesService.getAll().then(async (cities) => {
      if (cities.length > 0) {
        const city = cities[0]
        setSelectedCity(city)
        const fics = await citiesService.getCityFictions(city.id)
        setAvailableFictions(fics)
        setSelectedFictionIds(fics.map((f) => f.id))
      }
    })
  }, [citiesService])

  useEffect(() => {
    if (!selectedCity || selectedFictionIds.length === 0) {
      setFilteredLocations([])
      return
    }
    locationsService.getFiltered(selectedCity.id, selectedFictionIds).then(setFilteredLocations)
  }, [selectedCity?.id, selectedFictionIds, locationsService])

  const handleCityChange = useCallback(async (city: City) => {
    setSelectedCity(city)
    setSelectedLocation(null)
    setFocusedLocationId(null)
    const fics = await citiesService.getCityFictions(city.id)
    setAvailableFictions(fics)
    setSelectedFictionIds(fics.map((f) => f.id))
  }, [citiesService])

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

  const handleOpenPlacePage = useCallback((location: Location) => {
    setSelectedLocation(null)
    setPlacePageLocation(location)
  }, [])

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

  if (!selectedCity) return null

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
        <CitySelector selectedCity={selectedCity} onCityChange={handleCityChange} />
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
          onClose={() => setSelectedLocation(null)}
          onViewPlace={handleOpenPlacePage}
        />
      )}

      {placePageLocation && (
        <div className="absolute inset-0 z-[3000] flex min-h-0 flex-col overflow-hidden bg-background">
          <div className="flex-1 min-h-0 overflow-hidden">
            <PlacePage
              location={placePageLocation}
              onBack={() => setPlacePageLocation(null)}
            />
          </div>
        </div>
      )}
      </div>
    </MapProvider>
  )
}
