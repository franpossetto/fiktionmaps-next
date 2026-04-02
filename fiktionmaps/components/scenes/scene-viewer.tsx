"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Play, Pause, Film } from "lucide-react"
import type { City } from "@/src/cities/city.domain"
import type { Fiction } from "@/src/fictions/fiction.domain"
import type { Location } from "@/src/locations"
import { DEFAULT_FICTION_ACCENT } from "@/lib/constants/placeholders"
import { CitySelector } from "@/components/map/city-selector"
import { FictionSelector } from "@/components/map/fiction-selector"
import { ScenesEmptyHint } from "@/components/scenes/scenes-empty-hint"

interface SceneViewerProps {
  initialCities?: City[]
  initialSelectedCity?: City | null
  initialAvailableFictions?: Fiction[]
}

export function SceneViewer({
  initialCities,
  initialSelectedCity = null,
  initialAvailableFictions,
}: SceneViewerProps = {}) {
  const [citiesList, setCitiesList] = useState<City[]>(() => initialCities ?? [])
  const [selectedCity, setSelectedCity] = useState<City | null>(initialSelectedCity)
  const [selectedFictionIds, setSelectedFictionIds] = useState<string[]>([])
  const [availableFictions, setAvailableFictions] = useState<Fiction[]>(initialAvailableFictions ?? [])
  const [scenes, setScenes] = useState<Location[]>([])
  const [scenesLoading, setScenesLoading] = useState(Boolean(initialSelectedCity))
  const [hintCities, setHintCities] = useState<Pick<City, "id" | "name" | "country">[]>([])
  const [hintVariant, setHintVariant] = useState<"scoped" | "global" | null>(null)
  const [hintsLoading, setHintsLoading] = useState(false)
  const [fiction, setFiction] = useState<Fiction | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (initialCities !== undefined) return
    let cancelled = false
    fetch("/api/scenes/cities")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: City[]) => {
        if (!cancelled) setCitiesList(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [initialCities])

  useEffect(() => {
    if (initialSelectedCity) return
    let cancelled = false
    ;(async () => {
      try {
        const allCities =
          initialCities !== undefined
            ? initialCities
            : ((await (await fetch("/api/scenes/cities")).json()) as City[])
        if (!cancelled && allCities.length > 0) setSelectedCity(allCities[0])
      } catch {
        if (!cancelled) setSelectedCity(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [initialSelectedCity, initialCities])

  useEffect(() => {
    if (!selectedCity) return
    if (initialSelectedCity && selectedCity.id === initialSelectedCity.id && initialAvailableFictions) {
      if (availableFictions.length === 0) {
        setAvailableFictions(initialAvailableFictions)
        setSelectedFictionIds(initialAvailableFictions.map((f) => f.id))
      }
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/scenes/city-fictions-with-scenes?cityId=${encodeURIComponent(selectedCity.id)}`,
        )
        const fics = (await res.json()) as Fiction[]
        if (!cancelled) {
          setAvailableFictions(fics)
          setSelectedFictionIds(fics.map((f) => f.id))
        }
      } catch {
        if (!cancelled) {
          setAvailableFictions([])
          setSelectedFictionIds([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedCity, initialSelectedCity, initialAvailableFictions, availableFictions.length])

  useEffect(() => {
    if (!selectedCity) {
      setScenes([])
      setScenesLoading(false)
      return
    }
    const fictionIds = selectedFictionIds.length > 0
      ? selectedFictionIds
      : availableFictions.map((f) => f.id)
    if (fictionIds.length === 0) {
      setScenes([])
      setScenesLoading(false)
      return
    }
    const params = new URLSearchParams()
    for (const id of fictionIds) params.append("fictionIds[]", id)
    params.set("cityId", selectedCity.id)
    let cancelled = false
    setScenesLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/scenes/for-viewer?${params.toString()}`)
        if (!res.ok) throw new Error("for-viewer failed")
        const data = (await res.json()) as Location[]
        if (!cancelled) {
          setScenes(Array.isArray(data) ? data.filter((s) => s.videoUrl?.trim()) : [])
          setScenesLoading(false)
        }
      } catch {
        if (!cancelled) {
          setScenes([])
          setScenesLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedCity, selectedFictionIds, availableFictions])

  useEffect(() => {
    if (scenesLoading || scenes.length > 0 || !selectedCity) {
      setHintCities([])
      setHintVariant(null)
      setHintsLoading(false)
      return
    }
    const fictionIds =
      selectedFictionIds.length > 0 ? selectedFictionIds : availableFictions.map((f) => f.id)

    const otherThanCurrent = (list: Pick<City, "id" | "name" | "country">[]) =>
      list.filter((c) => c.id !== selectedCity.id)

    let cancelled = false
    setHintsLoading(true)
    ;(async () => {
      try {
        const params = new URLSearchParams()
        for (const id of fictionIds) params.append("fictionIds[]", id)
        let res = await fetch(`/api/scenes/city-hints?${params.toString()}`)
        let data = (await res.json()) as { cities?: Pick<City, "id" | "name" | "country">[] }
        let cities = data.cities ?? []
        let variant: "scoped" | "global" = fictionIds.length > 0 ? "scoped" : "global"

        if (fictionIds.length > 0 && otherThanCurrent(cities).length === 0) {
          res = await fetch("/api/scenes/city-hints")
          data = (await res.json()) as { cities?: Pick<City, "id" | "name" | "country">[] }
          cities = data.cities ?? []
          variant = "global"
        }

        if (!cancelled) {
          setHintCities(cities)
          setHintVariant(otherThanCurrent(cities).length > 0 ? variant : null)
        }
      } catch {
        if (!cancelled) {
          setHintCities([])
          setHintVariant(null)
        }
      } finally {
        if (!cancelled) setHintsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    scenesLoading,
    scenes.length,
    selectedFictionIds,
    availableFictions,
    selectedCity,
  ])

  const currentScene = scenes[currentIndex] || null
  const currentFictionId = currentScene?.fictionId

  useEffect(() => {
    if (!currentFictionId) {
      setFiction(null)
      return
    }
    setFiction(availableFictions.find((f) => f.id === currentFictionId) ?? null)
  }, [currentFictionId, availableFictions])

  const goNext = useCallback(() => {
    if (scenes.length === 0) return
    if (scenes.length === 1) {
      const v = videoRef.current
      if (v) {
        v.currentTime = 0
        void v.play()
      }
      setPaused(false)
      return
    }
    setCurrentIndex((prev) => (prev + 1) % scenes.length)
    setPaused(false)
  }, [scenes.length])

  const goPrev = useCallback(() => {
    if (scenes.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + scenes.length) % scenes.length)
      setPaused(false)
    }
  }, [scenes.length])

  const handleCityChange = (city: City) => {
    setSelectedCity(city)
    setCurrentIndex(0)
    setPaused(false)
  }

  const toggleFiction = (fictionId: string) => {
    setSelectedFictionIds((prev) => {
      const next = prev.includes(fictionId)
        ? prev.filter((id) => id !== fictionId)
        : [...prev, fictionId]
      setCurrentIndex(0)
      setPaused(false)
      return next
    })
  }

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setPaused(false)
    } else {
      videoRef.current.pause()
      setPaused(true)
    }
  }, [])

  // Show controls temporarily on mouse move
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        goNext()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        goPrev()
      } else if (e.key === "m") {
        setMuted((p) => !p)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [goNext, goPrev])

  if (scenesLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading scenes…</p>
      </div>
    )
  }

  if (!currentScene || !fiction) {
    const fictionIdsForHint =
      selectedFictionIds.length > 0 ? selectedFictionIds : availableFictions.map((f) => f.id)
    const otherCitiesWithScenes =
      selectedCity ? hintCities.filter((c) => c.id !== selectedCity.id) : []

    return (
      <div className="relative flex h-full w-full flex-col bg-background">
        <div className="pointer-events-auto absolute left-4 top-4 z-[1000] flex items-center gap-2">
          <FictionSelector
            availableFictions={availableFictions}
            selectedFictionIds={selectedFictionIds}
            onToggleFiction={toggleFiction}
          />
        </div>
        {selectedCity && (
          <div className="pointer-events-auto absolute right-4 top-4 z-[1000] flex items-center gap-2">
            <CitySelector
              cities={citiesList.length > 0 ? citiesList : undefined}
              selectedCity={selectedCity}
              onCityChange={handleCityChange}
            />
          </div>
        )}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-muted-foreground">
          <Film className="h-16 w-16 opacity-40" />
          <p className="text-lg font-medium text-foreground">
            {citiesList.length === 0
              ? "No scenes in the catalog yet"
              : !selectedCity
                ? "No scenes available"
                : "No scenes in this city"}
          </p>
          <p className="text-center text-sm">
            {citiesList.length === 0
              ? "Check back when new scenes are added."
              : fictionIdsForHint.length === 0
                ? "Select fictions on the left to see scenes."
                : "Try another city or adjust which fictions are included."}
          </p>
          {!hintsLoading && hintVariant != null && (
            <ScenesEmptyHint
              variant={hintVariant}
              otherCitiesWithScenes={otherCitiesWithScenes}
              onPickCity={handleCityChange}
              cities={citiesList}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative flex h-full w-full cursor-pointer select-none bg-black"
      onMouseMove={handleMouseMove}
      onClick={togglePlayPause}
    >
      {/* Full-screen video */}
      <video
        ref={videoRef}
        key={currentScene.id}
        src={currentScene.videoUrl}
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        poster={currentScene.image?.trim() || undefined}
        onEnded={(e) => {
          e.stopPropagation()
          goNext()
        }}
      />

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Top bar — fiction left / city right (same rhythm as Map); light controls on video. */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-auto absolute left-4 top-4 z-[1000] flex flex-wrap items-center gap-2 [&_button]:border-white/25 [&_button]:bg-black/45 [&_button]:text-white [&_button]:shadow-md [&_button]:backdrop-blur-md [&_button]:hover:bg-black/60 [&_button_svg]:!text-white [&_button_span]:text-white">
          <FictionSelector
            availableFictions={availableFictions}
            selectedFictionIds={selectedFictionIds}
            onToggleFiction={toggleFiction}
          />
        </div>
        {selectedCity && (
          <div className="pointer-events-auto absolute right-4 top-4 z-[1000] flex flex-wrap items-center gap-2 [&_button]:border-white/25 [&_button]:bg-black/45 [&_button]:text-white [&_button]:shadow-md [&_button]:backdrop-blur-md [&_button]:hover:bg-black/60 [&_button_svg]:!text-white [&_button_span]:text-white">
            <CitySelector
              cities={citiesList.length > 0 ? citiesList : undefined}
              selectedCity={selectedCity}
              onCityChange={handleCityChange}
            />
          </div>
        )}
      </div>

      {/* Nav arrows - left / right click zones */}
      {scenes.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className={`absolute left-0 top-0 z-10 flex h-full w-20 items-center justify-start pl-3 transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Previous scene"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/75">
              <ChevronLeft className="h-5 w-5" />
            </div>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className={`absolute right-0 top-0 z-10 flex h-full w-20 items-center justify-end pr-3 transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Next scene"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/75">
              <ChevronRight className="h-5 w-5" />
            </div>
          </button>
        </>
      )}

      {/* Bottom info - minimal */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 px-6 pb-6 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scene progress bar */}
        {scenes.length > 1 && (
          <div className="flex gap-1">
            {scenes.map((scene, i) => (
              <button
                key={scene.id}
                onClick={() => {
                  setCurrentIndex(i)
                  setPaused(false)
                }}
                className={`h-0.5 flex-1 rounded-full transition-all ${
                  i === currentIndex
                    ? "bg-primary"
                    : i < currentIndex
                      ? "bg-white/55"
                      : "bg-white/25"
                }`}
                aria-label={`Go to scene ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Scene info */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className="rounded px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: DEFAULT_FICTION_ACCENT, color: "#fff" }}
              >
                {fiction.title}
              </span>
              <span className="text-xs text-white/75 drop-shadow-md">
                Scene {currentIndex + 1} of {scenes.length}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white drop-shadow-md [text-shadow:_0_1px_3px_rgb(0_0_0_/_0.9)]">
              {currentScene.name}
            </h2>
            <p className="max-w-lg text-sm text-white/85 line-clamp-1 drop-shadow-md [text-shadow:_0_1px_2px_rgb(0_0_0_/_0.85)]">
              {currentScene.sceneDescription}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                togglePlayPause()
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label={paused ? "Play" : "Pause"}
            >
              {paused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMuted((p) => !p)
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
