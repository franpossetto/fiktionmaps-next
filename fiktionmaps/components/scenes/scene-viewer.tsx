"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Play, Pause, Film } from "lucide-react"
import type { City } from "@/src/cities/city.domain"
import type { Fiction } from "@/src/fictions/fiction.domain"
import type { Location } from "@/src/locations"
import { DEFAULT_FICTION_ACCENT } from "@/lib/constants/placeholders"
import { useApi } from "@/lib/api"
import { CitySelector } from "@/components/map/city-selector"
import { FictionSelector } from "@/components/map/fiction-selector"

export function SceneViewer() {
  const { cities: cityService, fictions: fictionService, locations: locationService } = useApi()

  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [selectedFictionIds, setSelectedFictionIds] = useState<string[]>([])
  const [availableFictions, setAvailableFictions] = useState<Fiction[]>([])
  const [scenes, setScenes] = useState<Location[]>([])
  const [fiction, setFiction] = useState<Fiction | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    cityService.getAll().then((allCities) => {
      if (allCities.length > 0) setSelectedCity(allCities[0])
    })
  }, [cityService])

  useEffect(() => {
    if (!selectedCity) return
    cityService.getCityFictions(selectedCity.id).then((fics) => {
      setAvailableFictions(fics)
      setSelectedFictionIds(fics.map((f) => f.id))
    })
  }, [selectedCity, cityService])

  useEffect(() => {
    if (!selectedCity) return
    if (selectedFictionIds.length > 0) {
      locationService.getFiltered(selectedCity.id, selectedFictionIds).then(setScenes)
    } else {
      locationService.getByCityId(selectedCity.id).then(setScenes)
    }
  }, [selectedCity, selectedFictionIds, locationService])

  const currentScene = scenes[currentIndex] || null
  const currentFictionId = currentScene?.fictionId

  useEffect(() => {
    if (!currentFictionId) {
      setFiction(null)
      return
    }
    fictionService.getById(currentFictionId).then((f) => setFiction(f ?? null))
  }, [currentFictionId, fictionService])

  const goNext = useCallback(() => {
    if (scenes.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % scenes.length)
      setPaused(false)
    }
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

  // Auto-advance on video end
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const handleEnd = () => goNext()
    video.addEventListener("ended", handleEnd)
    return () => video.removeEventListener("ended", handleEnd)
  }, [goNext, currentIndex])

  if (!currentScene || !fiction) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Film className="h-16 w-16 opacity-40" />
          <p className="text-lg font-medium">No scenes available</p>
          <p className="text-sm">Select a city and fiction to start</p>
          <div className="flex items-center gap-3 pt-4">
            <FictionSelector
              availableFictions={availableFictions}
              selectedFictionIds={selectedFictionIds}
              onToggleFiction={toggleFiction}
            />
            {selectedCity && <CitySelector selectedCity={selectedCity} onCityChange={handleCityChange} />}
          </div>
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
        className="absolute inset-0 h-full w-full object-cover"
        poster={currentScene.image}
      />

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Top bar - selectors */}
      <div
        className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <FictionSelector
          availableFictions={availableFictions}
          selectedFictionIds={selectedFictionIds}
          onToggleFiction={toggleFiction}
        />
        {selectedCity && <CitySelector selectedCity={selectedCity} onCityChange={handleCityChange} />}
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-colors hover:bg-black/70">
              <ChevronLeft className="h-5 w-5 text-foreground" />
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-colors hover:bg-black/70">
              <ChevronRight className="h-5 w-5 text-foreground" />
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
                      ? "bg-foreground/50"
                      : "bg-foreground/20"
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
              <span className="text-xs text-foreground/60">
                Scene {currentIndex + 1} of {scenes.length}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground drop-shadow-lg">
              {currentScene.name}
            </h2>
            <p className="max-w-lg text-sm text-foreground/70 line-clamp-1 drop-shadow-lg">
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/20 backdrop-blur-sm transition-colors hover:bg-foreground/30"
              aria-label={paused ? "Play" : "Pause"}
            >
              {paused ? (
                <Play className="h-4 w-4 text-foreground" />
              ) : (
                <Pause className="h-4 w-4 text-foreground" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMuted((p) => !p)
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/20 backdrop-blur-sm transition-colors hover:bg-foreground/30"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-foreground" />
              ) : (
                <Volume2 className="h-4 w-4 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
