"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { ArrowLeft, Play, Pause, Volume2, VolumeX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PageStickyBar } from "@/components/layout/page-sticky-bar"
import type { Location } from "@/src/locations/domain/location.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import { DEFAULT_FICTION_ACCENT } from "@/lib/constants/placeholders"

export function SceneWatchView({
  currentWatchScene,
  fiction,
  isTvSeries,
  upNextScenes,
  sceneLocations,
  onBack,
  onSelectScene,
}: {
  currentWatchScene: Scene
  fiction?: Fiction
  isTvSeries: boolean
  upNextScenes: Scene[]
  sceneLocations: Map<string, Location>
  onBack: () => void
  onSelectScene: (scene: Scene) => void
}) {
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const watchVideoRef = useRef<HTMLVideoElement>(null)

  const toggleWatchPlayPause = () => {
    const video = watchVideoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setPaused(false)
      return
    }
    video.pause()
    setPaused(true)
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
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
        title={
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{currentWatchScene.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {fiction?.title || "Scene"}
              {currentWatchScene.timestamp ? ` • ${currentWatchScene.timestamp}` : ""}
            </p>
          </div>
        }
      />

      <div className="mx-auto grid w-full max-w-[1500px] gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-black">
            <video
              ref={watchVideoRef}
              key={currentWatchScene.id}
              src={currentWatchScene.videoUrl || undefined}
              poster={currentWatchScene.thumbnail || undefined}
              autoPlay
              controls
              muted={muted}
              playsInline
              className="aspect-video w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {fiction && (
              <Badge
                className="border-0 text-[11px]"
                style={{ backgroundColor: DEFAULT_FICTION_ACCENT + "33", color: DEFAULT_FICTION_ACCENT }}
              >
                {fiction.title}
              </Badge>
            )}
            {currentWatchScene.timestamp && (
              <Badge variant="secondary" className="text-[11px]">
                {currentWatchScene.timestamp}
              </Badge>
            )}
            {isTvSeries && currentWatchScene.season && currentWatchScene.episode && (
              <Badge variant="secondary" className="text-[11px]">
                S{currentWatchScene.season} E{currentWatchScene.episode}
              </Badge>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-foreground">{currentWatchScene.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{currentWatchScene.description}</p>
            {currentWatchScene.quote && (
              <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 text-sm italic text-foreground/80">
                {`"${currentWatchScene.quote}"`}
              </blockquote>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleWatchPlayPause}
              className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {paused ? "Play" : "Pause"}
            </button>
            <button
              type="button"
              onClick={() => setMuted((current) => !current)}
              className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {muted ? "Unmute" : "Mute"}
            </button>
          </div>
        </section>

        <aside className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Up Next</h3>
          {upNextScenes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No other scenes in this fiction.</p>
          ) : (
            <div className="space-y-2">
              {upNextScenes.map((scene) => {
                const sceneLocation = sceneLocations.get(scene.locationId)
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => onSelectScene(scene)}
                    className="flex w-full gap-2 rounded-lg border border-border bg-card p-2 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
                  >
                    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-black">
                      <Image
                        src={scene.thumbnail || "/placeholder.svg"}
                        alt={scene.title}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs font-semibold text-foreground">{scene.title}</p>
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                        {sceneLocation?.name || "Unknown location"}
                      </p>
                      {scene.timestamp && (
                        <p className="mt-1 text-[11px] text-muted-foreground">{scene.timestamp}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
