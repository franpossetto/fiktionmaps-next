"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import Image from "next/image"
import { ArrowLeft, MapPin, Play, Lightbulb, Quote, Film, Tv, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PageStickyBar } from "@/components/layout/page-sticky-bar"
import type { Location } from "@/src/locations/domain/location.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { Fiction, FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { City } from "@/src/cities/domain/city.entity"
import { DEFAULT_FICTION_ACCENT } from "@/lib/constants/placeholders"
import { SceneWatchView } from "@/components/scenes/scene-watch-view"
import { getAllCitiesAction } from "@/src/cities/infrastructure/next/city.actions"
import { getActiveFictionsAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import { getPlaceLocationAction } from "@/src/places/infrastructure/next/place.actions"
import { listScenesAction } from "@/src/scenes/infrastructure/next/scene.actions"

export interface PlacePageProps {
  location: Location
  /** When provided (e.g. from map), used instead of fetching. */
  fiction?: Fiction | FictionWithMedia | null
  /** When provided (e.g. from map), used instead of fetching. */
  city?: City | null
  onBack: () => void
}

export function PlacePage({
  location,
  fiction: fictionProp,
  city: cityProp,
  onBack,
}: PlacePageProps) {
  const [fiction, setFiction] = useState<Fiction | undefined>(fictionProp ?? undefined)
  const [city, setCity] = useState<City | undefined>(cityProp ?? undefined)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [fictionScenes, setFictionScenes] = useState<Scene[]>([])
  const [sceneLocations, setSceneLocations] = useState<Map<string, Location>>(new Map())

  useEffect(() => {
    if (fictionProp !== undefined) setFiction(fictionProp ?? undefined)
    if (cityProp !== undefined) setCity(cityProp ?? undefined)
  }, [fictionProp, cityProp])

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      const [f, c] = await Promise.all([
        fictionProp !== undefined
          ? Promise.resolve(fictionProp ?? null)
          : getActiveFictionsAction().then((rows) => rows.find((item) => item.id === location.fictionId) ?? null),
        cityProp !== undefined
          ? Promise.resolve(cityProp ?? null)
          : getAllCitiesAction()
              .then((rows) => rows.find((item) => item.id === location.cityId) ?? null),
      ])
      if (cancelled) return
      setFiction(f ?? undefined)
      setCity(c ?? undefined)

      const s = await listScenesAction({ placeId: location.id, active: "true" })
      if (cancelled) return
      setScenes(s)

      let fs = s
      if (f) {
        fs = await listScenesAction({ fictionId: f.id, active: "true" })
      }
      if (cancelled) return
      setFictionScenes(fs)
      const placeIds = [...new Set(fs.map((scene) => scene.placeId))]
      const placeEntries = await Promise.all(
        placeIds.map(async (id) => {
          const place = await getPlaceLocationAction(id)
          if (!place) return null
          return { placeId: id, place }
        }),
      )
      if (cancelled) return
      const locMap = new Map<string, Location>()
      for (const entry of placeEntries) {
        if (!entry) continue
        const matchingScene = fs.find((scene) => scene.placeId === entry.placeId)
        if (matchingScene) locMap.set(matchingScene.locationId, entry.place)
        locMap.set(entry.placeId, entry.place)
      }
      setSceneLocations(locMap)
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [location.id, location.fictionId, location.cityId, fictionProp, cityProp])

  // For TV series group by season; for movies/books keep flat
  const isTvSeries = fiction?.type === "tv-series"
  const seasons = useMemo(() => {
    if (!isTvSeries) return []
    const map = new Map<number, Scene[]>()
    for (const s of scenes) {
      const seasonNum = s.season ?? 1
      const arr = map.get(seasonNum) ?? []
      arr.push(s)
      map.set(seasonNum, arr)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [scenes, isTvSeries])

  const [selectedSeason, setSelectedSeason] = useState<number>(seasons[0]?.[0] ?? 1)
  const [sceneView, setSceneView] = useState<"detail" | "video">("detail")
  const [watchSceneId, setWatchSceneId] = useState<string | null>(null)
  const [heroVisible, setHeroVisible] = useState(true)
  const heroRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Detect when hero leaves viewport for sticky header
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const handleScroll = () => {
      const hero = heroRef.current
      if (!hero) return
      setStickyHeader(hero.getBoundingClientRect().bottom <= 0)
    }
    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])
  const [stickyHeader, setStickyHeader] = useState(false)

  const displayedScenes = isTvSeries
    ? seasons.find(([s]) => s === selectedSeason)?.[1] ?? []
    : scenes
  const currentWatchScene = useMemo(
    () => fictionScenes.find((scene) => scene.id === watchSceneId) ?? null,
    [fictionScenes, watchSceneId],
  )

  useEffect(() => {
    setWatchSceneId(null)
  }, [location.id])

  if (currentWatchScene) {
    const upNextScenes = fictionScenes.filter((scene) => scene.id !== currentWatchScene.id)

    return (
      <SceneWatchView
        currentWatchScene={currentWatchScene}
        fiction={fiction}
        isTvSeries={isTvSeries}
        upNextScenes={upNextScenes}
        sceneLocations={sceneLocations}
        onBack={() => setWatchSceneId(null)}
        onSelectScene={(scene) => setWatchSceneId(scene.id)}
      />
    )
  }

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto bg-background">
      {/* Sticky header */}
      {stickyHeader && (
        <PageStickyBar
          className="px-6"
          leading={
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
          title={<span className="text-sm font-semibold text-foreground">{location.name}</span>}
          trailing={
            fiction ? (
              <Badge
                className="text-[11px] border-0"
                style={{ backgroundColor: DEFAULT_FICTION_ACCENT, color: "#fff" }}
              >
                {fiction.title}
              </Badge>
            ) : null
          }
        />
      )}

      {/* Hero */}
      <div ref={heroRef} className="relative h-64 shrink-0 overflow-hidden md:h-80">
        <Image
          src={location.image}
          alt={location.name}
          fill
          className="object-cover"
          priority
          loading="eager"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute left-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur-sm transition-colors hover:bg-background/80"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 pb-16 pt-0 md:px-8">
        {/* Location meta */}
        <div className="flex flex-col gap-3">
          {fiction && (
            <div className="flex items-center gap-2">
              <Badge
                className="text-xs border-0"
                style={{ backgroundColor: DEFAULT_FICTION_ACCENT + "33", color: DEFAULT_FICTION_ACCENT }}
              >
                {fiction.type === "tv-series" ? (
                  <Tv className="mr-1 h-3 w-3" />
                ) : (
                  <Film className="mr-1 h-3 w-3" />
                )}
                {fiction.title}
              </Badge>
              <span className="text-xs text-muted-foreground">{fiction.year}</span>
            </div>
          )}

          <h1 className="text-2xl font-bold leading-tight text-foreground text-balance md:text-3xl">
            {location.name}
          </h1>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">{location.address}</span>
            {city && (
              <>
                <span className="text-xs opacity-40">&middot;</span>
                <span className="text-xs">{city.name}, {city.country}</span>
              </>
            )}
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {location.description}
          </p>
        </div>

        {/* Visit Tip */}
        {location.visitTip && (
          <div className="mt-5 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                Visitor Tip
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {location.visitTip}
              </p>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="my-7 h-px bg-border/40" />

        {/* Scenes section — Netflix-style */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-foreground">
              {isTvSeries ? "Episodes filmed here" : "Scenes filmed here"}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center rounded-full border border-border/60 bg-secondary/30 p-1 text-[11px]">
                <button
                  onClick={() => setSceneView("detail")}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                    sceneView === "detail"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setSceneView("video")}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                    sceneView === "video"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Video
                </button>
              </div>
            </div>
          </div>

          {/* Season selector (TV only) */}
          {isTvSeries && seasons.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {seasons.map(([seasonNum, seasonScenes]) => (
                <button
                  key={seasonNum}
                  onClick={() => setSelectedSeason(seasonNum)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    selectedSeason === seasonNum
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Season {seasonNum}
                  <span className="ml-1.5 opacity-60">({seasonScenes.length})</span>
                </button>
              ))}
            </div>
          )}

          {/* Scene list */}
          {displayedScenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Film className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No scenes recorded yet</p>
            </div>
          ) : sceneView === "detail" ? (
            <div className="flex flex-col gap-3">
              {displayedScenes.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setWatchSceneId(scene.id)}
                  className="overflow-hidden rounded-xl border border-border bg-card transition-colors"
                >
                  <div className="flex w-full items-stretch gap-5 p-4 text-left">
                    {/* Thumbnail */}
                    <div className="relative w-[200px] min-h-[120px] shrink-0 overflow-hidden rounded-lg self-stretch">
                      <Image
                        src={scene.thumbnail || "/placeholder.svg"}
                        alt={scene.title}
                        fill
                        className="object-cover"
                        sizes="180px"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                        <Play className="h-5 w-5 text-foreground" />
                      </div>
                      {scene.timestamp && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white">
                          {scene.timestamp}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      {isTvSeries && scene.episodeTitle && (
                        <p className="text-[11px] font-medium text-muted-foreground">
                          S{scene.season} E{scene.episode} &middot; {scene.episodeTitle}
                        </p>
                      )}
                      {!isTvSeries && scene.timestamp && (
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {scene.timestamp}
                        </p>
                      )}
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {scene.title}
                      </h3>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {scene.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {scene.timestamp && (
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            {scene.timestamp}
                          </span>
                        )}
                        {scene.quote && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                            Quote
                          </span>
                        )}
                      </div>
                      {scene.quote && (
                        <div className="mt-2 flex gap-2">
                          <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
                          <p className="text-xs italic text-foreground/80 line-clamp-2">
                            {`"${scene.quote}"`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedScenes.map((scene) => (
                <div
                  key={scene.id}
                  className="overflow-hidden rounded-xl border border-border bg-card transition-colors"
                >
                  <div className="relative aspect-video w-full bg-black">
                    <video
                      src={scene.videoUrl || undefined}
                      poster={scene.thumbnail || undefined}
                      controls
                      preload="metadata"
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {scene.title}
                    </p>
                    <div className="flex items-center gap-2">
                      {scene.timestamp && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {scene.timestamp}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setWatchSceneId(scene.id)}
                        className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-foreground transition-colors hover:bg-secondary"
                      >
                        Watch
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scene quote highlight */}
        {location.sceneQuote && (
          <div className="mt-7 flex gap-3 rounded-xl border border-border bg-card px-5 py-4">
            <Quote className="mt-0.5 h-5 w-5 shrink-0 text-primary/50" />
            <p className="text-sm italic leading-relaxed text-foreground/80">
              {`"${location.sceneQuote}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
