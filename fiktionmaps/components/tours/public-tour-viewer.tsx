"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { useRouter } from "next/navigation"
import { ArrowLeft, Copy, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ResolvedTour } from "@/lib/modules/tours"
import type { City } from "@/lib/modules/cities"
import type { Fiction } from "@/lib/modules/fictions"
import { useApi } from "@/lib/api"
import { ToursMap } from "@/components/tours/tours-map"
import { PageStickyBar } from "@/components/layout/page-sticky-bar"
import { useAuth } from "@/context/auth-context"

interface PublicTourViewerProps {
  slug: string
}

function formatDate(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return "Unknown date"
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function PublicTourViewer({ slug }: PublicTourViewerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { cities: cityService, fictions: fictionService, tours } = useApi()
  const [allCities, setAllCities] = useState<City[]>([])
  const [allFictions, setAllFictions] = useState<Fiction[]>([])
  const [resolvedTour, setResolvedTour] = useState<ResolvedTour | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [heroVisible, setHeroVisible] = useState(true)
  const [activeStopIndex, setActiveStopIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cityService.getAll().then(setAllCities)
    fictionService.getAll().then(setAllFictions)
  }, [cityService, fictionService])

  useEffect(() => {
    setIsLoading(true)
    tours.getPublicTourBySlug(slug).then((found) => {
      setResolvedTour(found)
      setIsLoading(false)
    })
  }, [slug, tours])

  useEffect(() => {
    if (!resolvedTour) {
      setActiveStopIndex(0)
      return
    }
    setActiveStopIndex((current) => Math.max(0, Math.min(current, resolvedTour.stops.length - 1)))
  }, [resolvedTour])

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

  const cityNameById = useMemo(() => new Map(allCities.map((city) => [city.id, city.name])), [allCities])
  const fictionById = useMemo(() => new Map(allFictions.map((fiction) => [fiction.id, fiction])), [allFictions])

  const coverImage =
    resolvedTour?.tour.coverImage || resolvedTour?.stops[0]?.place.coverImage || "/logo-icon.png"

  const tourFictions = useMemo(() => {
    if (!resolvedTour) return []
    const fictionIds = new Set<string>()

    for (const stop of resolvedTour.stops) {
      for (const fictionId of stop.place.fictionIds) fictionIds.add(fictionId)
    }

    return Array.from(fictionIds)
      .map((fictionId) => fictionById.get(fictionId))
      .filter((fiction): fiction is Fiction => Boolean(fiction))
  }, [fictionById, resolvedTour])
  const routeMetrics = useMemo(() => {
    if (!resolvedTour) return tours.calculateTourMetrics([])
    return tours.calculateTourMetrics(resolvedTour.stops)
  }, [resolvedTour, tours])

  const handleCopyLink = useCallback(async () => {
    if (typeof window === "undefined") return
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }, [])

  const handleSelectStop = useCallback((index: number) => {
    setActiveStopIndex(index)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        Loading tour...
      </div>
    )
  }

  if (!resolvedTour) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-lg font-semibold">Tour not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This tour does not exist or is private.
          </p>
          <Link
            href="/tours"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tours
          </Link>
        </div>
      </div>
    )
  }

  const creatorLabel =
    resolvedTour.tour.createdBy && resolvedTour.tour.createdBy.includes("@")
      ? resolvedTour.tour.createdBy.split("@")[0]
      : resolvedTour.tour.createdBy?.startsWith("user-")
        ? "Community member"
        : resolvedTour.tour.createdBy || "Community"
  const cityLabel =
    resolvedTour.tour.mode === "singleCity" && resolvedTour.tour.cityId
      ? cityNameById.get(resolvedTour.tour.cityId) ?? "Unknown city"
      : "Multi-city"
  const effectiveWalkable =
    typeof resolvedTour.tour.walkable === "boolean"
      ? resolvedTour.tour.walkable
      : routeMetrics.suggestedWalkable
  const effectiveEstimatedMinutes =
    typeof resolvedTour.tour.estimatedMinutes === "number"
      ? resolvedTour.tour.estimatedMinutes
      : routeMetrics.estimatedWalkMinutes

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto bg-background">
          {!heroVisible && (
            <PageStickyBar
              className="px-6"
              innerClassName="flex items-center justify-between gap-3"
              leading={
                <div className="flex min-w-0 items-center gap-3">
                  <Link
                    href="/tours"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
                    aria-label="Back to tours"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <p className="truncate text-sm font-semibold text-foreground">{resolvedTour.tour.title}</p>
                </div>
              }
              trailing={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-border bg-transparent text-xs"
                  onClick={handleCopyLink}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              }
            />
          )}

          <div ref={heroRef} className="relative h-[240px] overflow-hidden md:h-[290px]">
            <Image
              src={coverImage}
              alt={resolvedTour.tour.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-background/25" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-transparent" />

            <div className="absolute left-6 top-6 z-10 flex items-center gap-2">
              <Link
                href="/tours"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur-sm transition-colors hover:bg-background/80"
                aria-label="Back to tours"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 border-border/70 bg-background/60 text-xs backdrop-blur-sm hover:bg-background/80"
                onClick={handleCopyLink}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-6 md:px-8 md:pb-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {cityLabel}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {resolvedTour.stops.length} stop{resolvedTour.stops.length > 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {resolvedTour.tour.visibility}
                </Badge>
              </div>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {resolvedTour.tour.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                by {creatorLabel} • {formatDate(resolvedTour.tour.createdAt)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/70 px-2 py-1">
                  {effectiveWalkable ? "Walkable" : "Transport needed"}
                </span>
                <span className="rounded-full border border-border/70 px-2 py-1">
                  Est. {effectiveEstimatedMinutes} min
                </span>
                <span className="rounded-full border border-border/70 px-2 py-1">
                  {routeMetrics.totalDistanceKm.toFixed(1)} km
                </span>
              </div>
              {resolvedTour.tour.creatorTips?.trim() && (
                <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Creator suggestions:</span>{" "}
                  {resolvedTour.tour.creatorTips.trim()}
                </p>
              )}
            </div>
          </div>
          <div className="px-6 pb-10 pt-5 md:px-8">
            {tourFictions.length > 0 && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Included fictions
                  </p>
                  <p className="text-xs text-muted-foreground">{tourFictions.length} title(s)</p>
                </div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {tourFictions.map((fiction) => (
                    <article
                      key={fiction.id}
                      className="flex min-w-[170px] shrink-0 items-center gap-2 rounded-lg border border-border/70 bg-card/35 px-2 py-1.5"
                    >
                      <div className="relative h-12 w-8 overflow-hidden rounded-sm border border-border/70">
                        <Image
                          src={fiction.coverImage?.trim() || DEFAULT_FICTION_COVER}
                          alt={fiction.title}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{fiction.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{fiction.year}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:items-start">
              <div id="tour-stops" className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
                <section className="rounded-lg border border-border/70 bg-card/20 p-2">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold text-foreground">Stops</h2>
                    </div>
                    <span className="text-xs text-muted-foreground">{resolvedTour.stops.length}</span>
                  </div>
                  <p className="px-1 pb-2 text-xs text-muted-foreground">Select a stop to focus the map.</p>
                  <div className="space-y-1.5">
                    {resolvedTour.stops.map((stop, index) => {
                      const stopCity = cityNameById.get(stop.place.cityId)
                      const isActive = index === activeStopIndex

                      return (
                        <div
                          key={stop.id}
                          className={`rounded-lg border transition-colors ${
                            isActive
                              ? "border-primary/50 bg-primary/10"
                              : "border-border/70 bg-card/20 hover:border-primary/30"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectStop(index)}
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">
                              {index + 1}
                            </div>
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/70">
                              <Image
                                src={stop.place.coverImage}
                                alt={stop.place.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-foreground">{stop.place.name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {resolvedTour.tour.mode === "multiCity" && stopCity ? `${stopCity} • ` : ""}
                                {stop.place.address || "Focus on map"}
                              </p>
                            </div>
                          </button>
                          {isActive && (
                            <div className="space-y-1.5 border-t border-border/60 px-2 pb-2 pt-2">
                              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                                Creator recommendation
                              </p>
                              <p className="text-xs text-foreground">
                                {stop.note?.trim() || "No recommendation was added for this stop."}
                              </p>
                              {stop.place.visitTip && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-semibold text-foreground">Local tip:</span>{" "}
                                  {stop.place.visitTip}
                                </p>
                              )}
                              {stop.place.description && (
                                <p className="text-xs text-muted-foreground">{stop.place.description}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              </div>
  
              <div id="tour-map" className="space-y-2">
                <div className="overflow-hidden rounded-xl border border-border/70 bg-card/35 h-[44vh] min-h-[340px] lg:h-[calc(100vh-8.5rem)] lg:min-h-[560px]">
                  <ToursMap
                    selectedCityId={resolvedTour.tour.cityId ?? null}
                    places={[]}
                    stops={resolvedTour.stops}
                    activeStopIndex={activeStopIndex}
                    onSelectStop={handleSelectStop}
                    focusZoom={17}
                    showStopMarkers
                    showStopNumbers
                    showActiveStopMessage
                    showPolyline={false}
                    stopMarkerVariant="compact"
                    interactive={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the stops list to jump between places.
                </p>
              </div>
            </section>
          </div>
        </div>
  )
}
