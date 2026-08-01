"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { Clapperboard } from "lucide-react"
import type { Place } from "@/src/places/domain/place.entity"
import { MapProvider } from "@/lib/map"
import { SceneContributeRouteMap } from "@/components/contribute/scene/scene-contribute-route-map"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { cn } from "@/lib/utils"

export type ScenePlaceContributePublicPreviewProps = {
  fictionId: string
  fictionTitle: string
  sceneTitle: string
  videoPreviewUrl: string | null
  places: Place[]
  className?: string
}

export function ScenePlaceContributePublicPreview({
  fictionId,
  fictionTitle,
  sceneTitle,
  videoPreviewUrl,
  places,
  className,
}: ScenePlaceContributePublicPreviewProps) {
  const t = useTranslations("Contribute.scenePlace")

  return (
    <div className={cn("w-full min-w-0 space-y-5", className)}>
      <div className="text-center text-xs font-medium text-muted-foreground sm:text-sm">
        {t("previewRibbon")}
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
        {videoPreviewUrl ? (
          <video
            src={videoPreviewUrl}
            muted
            playsInline
            preload="metadata"
            controls
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Clapperboard className="h-8 w-8 opacity-60" aria-hidden />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {fictionTitle || "—"}
        </p>
        <h3 className="text-lg font-semibold leading-snug text-foreground">
          {sceneTitle.trim() || t("previewUntitledScene")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("previewPlacesCount", { count: places.length })}
        </p>
      </div>

      {places.length > 0 ? (
        <div className="relative h-[min(58vw,360px)] min-h-[240px] w-full overflow-hidden rounded-xl bg-muted sm:min-h-[280px] sm:h-[320px]">
          <MapProvider libraries={[]}>
            <SceneContributeRouteMap
              mapId="contribute-scene-place-preview-map"
              fictionId={fictionId}
              selectedPlaces={places}
              interactive={false}
            />
          </MapProvider>
        </div>
      ) : null}

      <ol className="space-y-3">
        {places.map((place, index) => (
          <li key={place.id} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {index + 1}
            </span>
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image
                src={place.image?.trim() || DEFAULT_FICTION_COVER}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{place.name}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {place.location.name}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
