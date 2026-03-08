"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, MapPin, Plus, Route } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { City } from "@/lib/modules/cities"
import type { Fiction } from "@/lib/modules/fictions"
import type { ResolvedTour } from "@/lib/modules/tours"
import { useApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { PageStickyBar } from "@/components/layout/page-sticky-bar"

function formatDate(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return "Unknown date"
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ToursLanding() {
  const router = useRouter()
  const { user } = useAuth()
  const { cities: cityService, fictions: fictionService, tours } = useApi()
  const [allCities, setAllCities] = useState<City[]>([])
  const [allFictions, setAllFictions] = useState<Fiction[]>([])
  const [publicTours, setPublicTours] = useState<ResolvedTour[] | null>(null)
  const [selectedCityFilter, setSelectedCityFilter] = useState("all")
  const [selectedFictionFilter, setSelectedFictionFilter] = useState("all")

  useEffect(() => {
    cityService.getAll().then(setAllCities)
    fictionService.getAll().then(setAllFictions)
  }, [cityService, fictionService])

  const cityNameById = useMemo(() => new Map(allCities.map((city) => [city.id, city.name])), [allCities])
  const fictionById = useMemo(() => new Map(allFictions.map((fiction) => [fiction.id, fiction])), [allFictions])

  const refreshTours = useCallback(() => {
    tours.listPublicTours().then(setPublicTours)
  }, [tours])

  useEffect(() => {
    refreshTours()
    window.addEventListener("storage", refreshTours)
    window.addEventListener("focus", refreshTours)
    return () => {
      window.removeEventListener("storage", refreshTours)
      window.removeEventListener("focus", refreshTours)
    }
  }, [refreshTours])

  const cityFilterOptions = useMemo(() => {
    if (!publicTours) return []
    const cityIds = new Set<string>()
    for (const entry of publicTours) {
      const cityId = entry.tour.cityId ?? entry.stops[0]?.place.cityId
      if (cityId) cityIds.add(cityId)
    }
    return Array.from(cityIds)
      .map((cityId) => ({
        id: cityId,
        name: cityNameById.get(cityId) ?? cityId,
      }))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [cityNameById, publicTours])

  const fictionFilterOptions = useMemo(() => {
    if (!publicTours) return []
    const fictionIds = new Set<string>()
    for (const entry of publicTours) {
      for (const stop of entry.stops) {
        for (const fictionId of stop.place.fictionIds) fictionIds.add(fictionId)
      }
    }
    return Array.from(fictionIds)
      .map((fictionId) => fictionById.get(fictionId))
      .filter((fiction): fiction is Fiction => Boolean(fiction))
      .sort((left, right) => left.title.localeCompare(right.title))
  }, [fictionById, publicTours])

  useEffect(() => {
    if (selectedCityFilter === "all") return
    const exists = cityFilterOptions.some((city) => city.id === selectedCityFilter)
    if (!exists) setSelectedCityFilter("all")
  }, [cityFilterOptions, selectedCityFilter])

  useEffect(() => {
    if (selectedFictionFilter === "all") return
    const exists = fictionFilterOptions.some((fiction) => fiction.id === selectedFictionFilter)
    if (!exists) setSelectedFictionFilter("all")
  }, [fictionFilterOptions, selectedFictionFilter])

  const filteredTours = useMemo(() => {
    if (!publicTours) return null
    return publicTours.filter((entry) => {
      const cityId = entry.tour.cityId ?? entry.stops[0]?.place.cityId ?? null
      const fictionIds = new Set(entry.stops.flatMap((stop) => stop.place.fictionIds))

      if (selectedCityFilter !== "all" && cityId !== selectedCityFilter) return false
      if (selectedFictionFilter !== "all" && !fictionIds.has(selectedFictionFilter)) return false
      return true
    })
  }, [publicTours, selectedCityFilter, selectedFictionFilter])

  const resultsCount = filteredTours?.length ?? 0

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-background to-background/50">
          <PageStickyBar
            className="z-20 bg-card/50 px-4 py-5 md:px-6"
            innerClassName="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4"
            title={
              <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground">Community Routes</h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Explore public tours created by other users, then build your own route.
                </p>
              </div>
            }
            trailing={
              <Button asChild className="h-10">
                <Link href="/tours/create-tour-2">
                  <Plus className="h-4 w-4" />
                  Create New Tour
                </Link>
              </Button>
            }
          />

          <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-5 md:px-6">
            <section className="mb-5 flex flex-wrap items-end gap-3 border-b border-border/50 pb-4">
              <div className="min-w-[180px]">
                <label className="mb-1 block text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  City
                </label>
                <Select value={selectedCityFilter} onValueChange={setSelectedCityFilter}>
                  <SelectTrigger className="h-9 min-w-[180px]">
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {cityFilterOptions.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[220px]">
                <label className="mb-1 block text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Fiction
                </label>
                <Select value={selectedFictionFilter} onValueChange={setSelectedFictionFilter}>
                  <SelectTrigger className="h-9 min-w-[220px]">
                    <SelectValue placeholder="All fictions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All fictions</SelectItem>
                    {fictionFilterOptions.map((fiction) => (
                      <SelectItem key={fiction.id} value={fiction.id}>
                        {fiction.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="pb-1 text-xs text-muted-foreground">{resultsCount} tours</p>
            </section>

            <section>
              {publicTours === null ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  Loading tours...
                </div>
              ) : publicTours.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <p className="text-lg font-semibold text-foreground">No public tours yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Be the first to publish one.</p>
                  <Button asChild className="mt-4">
                    <Link href="/tours/create-tour-2">Create New Tour</Link>
                  </Button>
                </div>
              ) : filteredTours && filteredTours.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <p className="text-base font-semibold text-foreground">No tours for this filter</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try another city or fiction.</p>
                </div>
              ) : (
                <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4">
                  {filteredTours?.map((entry, index) => {
                    const coverImage = entry.tour.coverImage || entry.stops[0]?.place.coverImage || "/logo-icon.png"
                    const cityLabel =
                      entry.tour.mode === "singleCity" && entry.tour.cityId
                        ? cityNameById.get(entry.tour.cityId) ?? "Unknown city"
                        : "Multi-city"
                    const fictionIds = Array.from(new Set(entry.stops.flatMap((stop) => stop.place.fictionIds)))
                    const topFiction = fictionById.get(fictionIds[0])?.title
                    const imageHeights = [170, 220, 190, 240]
                    const imageHeight = imageHeights[index % imageHeights.length]
                    const creatorLabel =
                      entry.tour.createdBy && entry.tour.createdBy.includes("@")
                        ? entry.tour.createdBy.split("@")[0]
                        : entry.tour.createdBy?.startsWith("user-")
                          ? "Community member"
                          : entry.tour.createdBy || "Community"

                    return (
                      <article
                        key={entry.tour.id}
                        className="mb-3 break-inside-avoid overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
                      >
                        <Link href={`/tours/${entry.tour.slug}`} className="block">
                          <div className="relative w-full" style={{ height: `${imageHeight}px` }}>
                            <Image
                              src={coverImage}
                              alt={entry.tour.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                          </div>
                          <div className="p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <h2 className="truncate text-sm font-semibold text-foreground">{entry.tour.title}</h2>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            </div>
                            {entry.tour.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.tour.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" className="text-[11px] font-normal">
                                <MapPin className="mr-1 h-3 w-3" />
                                {cityLabel}
                              </Badge>
                              <Badge variant="secondary" className="text-[11px] font-normal">
                                <Route className="mr-1 h-3 w-3" />
                                {entry.stops.length} stops
                              </Badge>
                              {topFiction && (
                                <Badge variant="secondary" className="text-[11px] font-normal">
                                  {topFiction}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              by {creatorLabel} • {formatDate(entry.tour.createdAt)}
                            </p>
                          </div>
                        </Link>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
  )
}
