"use client"

import { useRef, useEffect, useState } from "react"
import { Tv, Film, Play } from "lucide-react"
import type { Scene } from "@/src/scenes"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { FilmMomentTimeline } from "./film-moment-timeline"

export interface SceneClipPanelCardProps {
  scene: Scene
  fiction?: FictionWithMedia | null
  noVideoLabel: string
  playVideoLabel?: string
  filmTimelineCaption?: string
}

/**
 * One scene block: title → video → timeline → copy. No extra wrapper boxes.
 */
export function SceneClipPanelCard({
  scene,
  fiction,
  noVideoLabel,
  playVideoLabel = "Play video",
  filmTimelineCaption,
}: SceneClipPanelCardProps) {
  const isTv = fiction?.type === "tv-series"
  const hasVideo = Boolean(scene.videoUrl?.trim())
  const [modalOpen, setModalOpen] = useState(false)
  const modalVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = modalVideoRef.current
    if (!el) return
    if (modalOpen) {
      const p = el.play()
      if (p !== undefined) p.catch(() => {})
    } else {
      el.pause()
      el.currentTime = 0
    }
  }, [modalOpen])

  return (
    <>
      <section className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-base font-semibold leading-snug tracking-tight text-foreground">
            {scene.title}
          </h4>
          {isTv && scene.season != null && scene.episode != null ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                <Tv className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                S{scene.season} · E{scene.episode}
              </span>
              {scene.episodeTitle ? (
                <span className="text-[12px] text-muted-foreground line-clamp-2">{scene.episodeTitle}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="relative aspect-video w-full min-w-0 overflow-hidden rounded-xl bg-black ring-1 ring-border/60">
          {hasVideo ? (
            <>
              <video
                aria-hidden
                muted
                playsInline
                preload="metadata"
                src={scene.videoUrl!}
                poster={scene.thumbnail?.trim() || undefined}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                aria-label={playVideoLabel}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-black shadow-lg ring-2 ring-black/30">
                  <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden />
                </span>
              </button>
            </>
          ) : (
            <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 px-4 text-center">
              <div className="rounded-full bg-secondary p-3">
                <Film className="h-8 w-8 text-muted-foreground" aria-hidden />
              </div>
              <p className="text-xs text-muted-foreground">{noVideoLabel}</p>
            </div>
          )}
        </div>

        <FilmMomentTimeline
          timestampLabel={scene.timestamp}
          caption={filmTimelineCaption}
          durationSec={fiction?.duration_sec ?? null}
        />

        {(scene.description || scene.quote) && (
          <div className="space-y-2">
            {scene.description ? (
              <p className="text-[13px] leading-relaxed text-foreground/85 line-clamp-5">{scene.description}</p>
            ) : null}
            {scene.quote ? (
              <blockquote className="border-l-2 border-[#E50914] pl-2.5 text-[12px] italic leading-relaxed text-foreground/90">
                &ldquo;{scene.quote}&rdquo;
              </blockquote>
            ) : null}
          </div>
        )}
      </section>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className={cn(
            "max-h-[92vh] w-[min(96vw,960px)] max-w-none gap-0 overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-left shadow-2xl sm:rounded-xl",
            "[&>button]:right-3 [&>button]:top-3 [&>button]:z-[10001] [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:hover:bg-white/10"
          )}
        >
          <video
            ref={modalVideoRef}
            src={scene.videoUrl ?? undefined}
            poster={scene.thumbnail?.trim() || undefined}
            controls
            playsInline
            preload="metadata"
            className="max-h-[min(75vh,900px)] w-full bg-black object-contain"
          />

          <DialogHeader className="space-y-3 border-t border-zinc-800 px-5 py-4 text-left">
            <DialogTitle className="pr-8 text-lg font-semibold leading-snug text-foreground">
              {scene.title}
            </DialogTitle>
            <FilmMomentTimeline
              timestampLabel={scene.timestamp}
              caption={filmTimelineCaption}
              durationSec={fiction?.duration_sec ?? null}
              showFallbackHint={false}
              className="text-zinc-400 [&_.text-foreground]:text-zinc-100"
            />
            {isTv && scene.season != null && scene.episode != null ? (
              <p className="text-[12px] text-muted-foreground">
                S{scene.season} · E{scene.episode}
                {scene.episodeTitle ? ` · ${scene.episodeTitle}` : ""}
              </p>
            ) : null}
            {scene.description ? (
              <DialogDescription className="text-sm leading-relaxed text-foreground/85">
                {scene.description}
              </DialogDescription>
            ) : null}
            {scene.quote ? (
              <p className="text-sm italic text-foreground/90">&ldquo;{scene.quote}&rdquo;</p>
            ) : null}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
