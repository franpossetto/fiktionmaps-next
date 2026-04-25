"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Image from "next/image"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Location } from "@/src/locations/domain/location.entity"
import type { City } from "@/src/cities/domain/city.entity"
import { Badge } from "@/components/ui/badge"
import { LocationCard } from "@/components/locations/location-card"
import { LocationDetailPanel } from "@/components/locations/location-detail-panel"
import { PageStickyBar } from "@/components/layout/page-sticky-bar"
import { MapPin, ArrowLeft, Clock } from "lucide-react"
import { getFictionLocationsAction } from "@/src/places/infrastructure/next/place.actions"
import { getFictionCitiesAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import { listScenesAction } from "@/src/scenes/infrastructure/next/scene.actions"

export interface FictionDetailProps {
  fiction: FictionWithMedia
  initialLocations?: Location[]
  initialCities?: City[]
  onBack: () => void
  onViewPlace?: (location: Location) => void
}

export function FictionDetail({
  fiction,
  initialLocations,
  initialCities,
  onBack,
  onViewPlace,
}: FictionDetailProps) {
  const [allLocations, setAllLocations] = useState<Location[]>(initialLocations ?? [])
  const [fictionCities, setFictionCities] = useState<City[]>(initialCities ?? [])
  const [cityMap, setCityMap] = useState<Map<string, City>>(
    () => new Map((initialCities ?? []).map((c) => [c.id, c]))
  )
  const [sceneCount, setSceneCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (initialLocations && initialCities) {
        if (cancelled) return
        setAllLocations(initialLocations)
        setFictionCities(initialCities)
        setCityMap(new Map(initialCities.map((c) => [c.id, c])))
        return
      }

      try {
        const [locations, cities] = await Promise.all([
          getFictionLocationsAction(fiction.id),
          getFictionCitiesAction(fiction.id),
        ])
        if (cancelled) return
        setAllLocations(locations)
        setFictionCities(cities)
        setCityMap(new Map(cities.map((c) => [c.id, c])))
      } catch {
        if (cancelled) return
        setAllLocations([])
        setFictionCities([])
        setCityMap(new Map())
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fiction.id, initialLocations, initialCities])

  useEffect(() => {
    let cancelled = false
    listScenesAction({ fictionId: fiction.id, active: "true" })
      .then((scenes) => {
        if (!cancelled) setSceneCount(scenes.length)
      })
      .catch(() => {
        if (!cancelled) setSceneCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [fiction.id])

  const [expandedLocation, setExpandedLocation] = useState<string | null>(null)
  const [heroVisible, setHeroVisible] = useState(true)
  const [coverError, setCoverError] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const heroSrc =
    !coverError &&
    (fiction.bannerImage?.trim() || fiction.coverImageLarge?.trim() || fiction.coverImage?.trim())
      ? (fiction.bannerImage?.trim() ||
          fiction.coverImageLarge?.trim() ||
          fiction.coverImage?.trim())!
      : DEFAULT_FICTION_COVER
  const coverSrc =
    !coverError && fiction.coverImage?.trim()
      ? fiction.coverImage.trim()
      : DEFAULT_FICTION_COVER

  const locationsByCity = useMemo(() => {
    const map = new Map<string, Location[]>()
    for (const loc of allLocations) {
      const arr = map.get(loc.cityId) || []
      arr.push(loc)
      map.set(loc.cityId, arr)
    }
    return map
  }, [allLocations])

  // Detect when hero goes out of view for sticky header (within scroll container)
  useEffect(() => {
    const root = scrollRef.current
    const hero = heroRef.current
    if (!root || !hero) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroVisible(entry.isIntersecting)
      },
      { threshold: 0.1, root },
    )

    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto bg-background">
      {/* Sticky header (appears when hero is out of view) */}
      {!heroVisible && (
        <PageStickyBar
          className="px-6"
          leading={
            <>
              <button
                onClick={onBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="relative h-11 w-8 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/40">
                <Image
                  src={coverSrc}
                  alt={fiction.title}
                  fill
                  className="object-cover"
                  sizes="32px"
                  onError={() => setCoverError(true)}
                />
              </div>
            </>
          }
          title={
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-foreground">{fiction.title}</h2>
              <p className="line-clamp-1 text-xs text-muted-foreground">{fiction.description}</p>
            </div>
          }
        />
      )}

      {/* Hero: banner when set, else cover */}
      <div ref={heroRef} className="relative h-[320px] md:h-[380px] flex-shrink-0 overflow-hidden">
        <Image
          src={heroSrc}
          alt={fiction.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
          onError={() => setCoverError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/30 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute left-6 top-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur-sm transition-colors hover:bg-background/80"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Info overlay: cover poster + title, meta */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-8">
          <div className="flex flex-row items-end gap-4">
            {/* Cover poster */}
            <div className="relative h-[120px] w-[80px] flex-shrink-0 overflow-hidden rounded-lg border border-border/60 shadow-xl sm:h-[200px] sm:w-[133px] md:h-[240px] md:w-[160px]">
              <Image
                src={coverSrc}
                alt={fiction.title}
                fill
                className="object-cover"
                sizes="160px"
                onError={() => setCoverError(true)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {fiction.type === "tv-series" ? "TV Series" : fiction.type === "book" ? "Book" : "Movie"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {fiction.genre}
                </Badge>
              </div>
              <h1 className="mt-2 font-sans text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                {fiction.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {fiction.year}
                </span>
                {fiction.author && (
                  <span>
                    {fiction.type === "movie"
                      ? "Directed by "
                      : fiction.type === "tv-series"
                        ? "Created by "
                        : "By "}
                    <span className="text-foreground">{fiction.author}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {allLocations.length} location{allLocations.length > 1 ? "s" : ""} in{" "}
                  {fictionCities.length} cit{fictionCities.length > 1 ? "ies" : "y"}
                  {(fiction.type === "movie" || fiction.type === "tv-series") && sceneCount > 0 && (
                    <>
                      {" "}
                      &middot; {sceneCount} scene{sceneCount > 1 ? "s" : ""}
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {fiction.description && (
        <div className="px-8 pb-2 pt-6">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {fiction.description}
          </p>
        </div>
      )}

      {/* Locations - full page scroll */}
      <div className="px-8 py-6">
        {Array.from(locationsByCity.entries()).map(([cityId, locs]) => {
          const city = cityMap.get(cityId)
          const activeLocation = locs.find((loc) => loc.id === expandedLocation)
          return (
            <div key={cityId} className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  {city?.name}, {city?.country}
                </h2>
                <span className="text-sm text-muted-foreground">
                  &middot; {locs.length} place{locs.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {locs.map((loc) => {
                  const isExpanded = expandedLocation === loc.id
                  const handleClick = () => {
                    if (onViewPlace) {
                      onViewPlace(loc)
                      return
                    }
                    setExpandedLocation(isExpanded ? null : loc.id)
                  }
                  const hoverLabel = onViewPlace
                    ? "Explore this place"
                    : isExpanded
                      ? "Hide details"
                      : "View details"
                  return (
                    <LocationCard
                      key={loc.id}
                      location={loc}
                      onClick={handleClick}
                      hoverLabel={hoverLabel}
                    />
                  )
                })}
              </div>

              {activeLocation && !onViewPlace && (
                <LocationDetailPanel location={activeLocation} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
