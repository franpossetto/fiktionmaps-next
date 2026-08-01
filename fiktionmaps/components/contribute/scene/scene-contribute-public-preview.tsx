"use client"

import { useTranslations } from "next-intl"
import { Film, Quote } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SceneContributePublicPreviewProps {
  fictionTitle: string
  placeNames: string[]
  title: string
  timecodeLabel: string | null
  isTv: boolean
  season: string
  episode: string
  episodeTitle: string
  description: string
  quote: string
  videoPreviewUrl: string | null
  className?: string
}

export function SceneContributePublicPreview({
  fictionTitle,
  placeNames,
  title,
  timecodeLabel,
  isTv,
  season,
  episode,
  episodeTitle,
  description,
  quote,
  videoPreviewUrl,
  className,
}: SceneContributePublicPreviewProps) {
  const t = useTranslations("Contribute.scene")

  const seasonEpisodeLabel =
    isTv && (season.trim() || episode.trim())
      ? [season.trim() ? `S${season.trim()}` : null, episode.trim() ? `E${episode.trim()}` : null]
          .filter(Boolean)
          .join("")
      : null

  const placesLabel =
    placeNames.length === 0
      ? null
      : placeNames.length === 1
        ? placeNames[0]
        : t("previewPlacesRoute", { count: placeNames.length, names: placeNames.join(" → ") })

  return (
    <div className={cn("w-full min-w-0 space-y-5", className)}>
      <div className="text-center text-xs font-medium text-muted-foreground sm:text-sm">
        {t("previewRibbon")}
      </div>

      <div className="overflow-hidden rounded-xl bg-black">
        {videoPreviewUrl ? (
          <video src={videoPreviewUrl} controls className="aspect-video w-full" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center text-muted-foreground/70">
            <Film className="h-8 w-8" aria-hidden />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {fictionTitle || "—"}
        </p>
        <h3 className="text-lg font-semibold leading-snug text-foreground">
          {title.trim() || t("previewUntitled")}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {placesLabel ? <span>{placesLabel}</span> : null}
          {timecodeLabel ? <span>{timecodeLabel}</span> : null}
          {seasonEpisodeLabel ? <span>{seasonEpisodeLabel}</span> : null}
        </div>
        {isTv && episodeTitle.trim() ? (
          <p className="text-xs text-muted-foreground">{episodeTitle.trim()}</p>
        ) : null}
      </div>

      {description.trim() ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{description.trim()}</p>
      ) : null}

      {quote.trim() ? (
        <blockquote className="flex items-start gap-2 text-sm italic leading-relaxed text-muted-foreground">
          <Quote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{quote.trim()}</span>
        </blockquote>
      ) : null}
    </div>
  )
}
