"use client"

import { useState, useRef } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import { DEFAULT_FICTION_ACCENT } from "@/lib/constants/placeholders"

export function SceneWatchView({
  currentWatchScene,
  fiction,
  fictionPathSlug,
  isTvSeries,
  placeName,
  placeSlug,
  useShellMainScroll = false,
}: {
  currentWatchScene: Scene
  fiction?: Fiction
  fictionPathSlug?: string
  isTvSeries: boolean
  placeName?: string
  placeSlug?: string
  useShellMainScroll?: boolean
}) {
  const tMeta = useTranslations("Metadata")
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
    <div
      className={
        useShellMainScroll ? "min-h-0 h-full bg-background" : "h-full overflow-y-auto bg-background"
      }
    >
      <section className="mx-auto w-full max-w-[1500px] space-y-4 px-6 py-6">
        {fiction && (
          <PageBreadcrumb
            ariaLabel={tMeta("breadcrumbNavAriaLabel")}
            items={[
              { label: tMeta("breadcrumbFictions"), href: "/fictions" },
              {
                label: fiction.title,
                href: fictionPathSlug ? `/fictions/${fictionPathSlug}` : undefined,
              },
              ...(placeName
                ? [{
                    label: placeName,
                    href:
                      fictionPathSlug && placeSlug
                        ? `/fictions/${fictionPathSlug}/places/${placeSlug}`
                        : undefined,
                  }]
                : []),
              { label: currentWatchScene.title },
            ]}
          />
        )}
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
    </div>
  )
}
