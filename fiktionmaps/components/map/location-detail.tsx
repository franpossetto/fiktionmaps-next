"use client"

import { X, MapPin, Quote, Lightbulb, Film, ArrowRight, Box } from "lucide-react"
import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import type { Location } from "@/src/locations/domain/location.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DEFAULT_FICTION_ACCENT } from "@/lib/constants/placeholders"
import Image from "next/image"
import { SceneClipPanelCard } from "./scene-clip-panel-card"
import { getActiveFictionsAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import { listScenesAction } from "@/src/scenes/infrastructure/next/scene.actions"

interface LocationDetailProps {
  location: Location
  /** When provided (e.g. from map page), used instead of fetching. */
  fiction?: FictionWithMedia | null
  onClose: () => void
  onViewPlace?: (location: Location) => void
  onView3D?: () => void
}

export function LocationDetail({
  location,
  fiction: fictionProp,
  onClose,
  onViewPlace,
  onView3D,
}: LocationDetailProps) {
  const t = useTranslations("Map")
  const [fiction, setFiction] = useState<FictionWithMedia | undefined>(
    fictionProp ?? undefined
  )
  const [placeScenes, setPlaceScenes] = useState<Scene[]>([])

  useEffect(() => {
    let cancelled = false
    if (fictionProp !== undefined) {
      setFiction(fictionProp ?? undefined)
    } else {
      getActiveFictionsAction()
        .then((rows) => {
          if (cancelled) return
          const hit = rows.find((f) => f.id === location.fictionId)
          setFiction(hit ?? undefined)
        })
        .catch(() => {
          if (!cancelled) setFiction(undefined)
        })
    }
    return () => {
      cancelled = true
    }
  }, [location.fictionId, fictionProp])

  useEffect(() => {
    let cancelled = false
    listScenesAction({ placeId: location.id, active: "true" })
      .then((s) => {
        if (!cancelled) setPlaceScenes(s)
      })
      .catch(() => {
        if (!cancelled) setPlaceScenes([])
      })
    return () => {
      cancelled = true
    }
  }, [location.id])

  const sceneCount = placeScenes.length

  return (
    <>
      <div
        className="absolute inset-0 z-[1990] bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-y-0 right-0 z-[2000] flex w-full flex-col border-l border-border bg-background sm:w-[420px]">
        {/* Header image */}
        <div className="relative h-56 shrink-0">
          <Image
            src={location.image || "/placeholder.svg"}
            alt={location.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
            aria-label="Close location detail"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
          {fiction && (
            <div className="absolute bottom-3 left-4">
              <Badge
                className="text-xs border-0"
                style={{ backgroundColor: DEFAULT_FICTION_ACCENT, color: "#fff" }}
              >
                <Film className="mr-1 h-3 w-3" />
                {fiction.title}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 p-5">
            {/* Title and address */}
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold text-foreground leading-tight text-balance">
                {location.name}
              </h2>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs">{location.address}</span>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                About this Location
              </h3>
              <p className="text-sm leading-relaxed text-secondary-foreground">
                {location.description}
              </p>
            </div>

            {/* Scene (text) */}
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                The Scene
              </h3>
              <p className="text-sm leading-relaxed text-secondary-foreground">
                {location.sceneDescription}
              </p>
              {location.sceneQuote && (
                <div className="mt-2 flex gap-2 rounded-md bg-secondary/60 p-3">
                  <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm italic text-foreground">
                    {location.sceneQuote}
                  </p>
                </div>
              )}
            </div>

            {placeScenes.length > 0 && (
              <>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("sceneClips")} · {t("sceneClipCount", { count: placeScenes.length })}
                </h3>
                {placeScenes.slice(0, 5).map((sc) => (
                  <SceneClipPanelCard
                    key={sc.id}
                    scene={sc}
                    fiction={fiction ?? null}
                    noVideoLabel={t("noSceneVideo")}
                    playVideoLabel={t("playSceneVideo")}
                    filmTimelineCaption={t("filmTimelineCaption")}
                  />
                ))}
                {placeScenes.length > 5 && (
                  <p className="text-center text-xs text-muted-foreground">
                    +{placeScenes.length - 5} more on the place page
                  </p>
                )}
              </>
            )}

            {/* Visit Tip */}
            {location.visitTip && (
              <div className="flex gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Visitor Tip
                  </h3>
                  <p className="text-sm leading-relaxed text-secondary-foreground">
                    {location.visitTip}
                  </p>
                </div>
              </div>
            )}

            {/* View Place Page CTA */}
            {onViewPlace && (
              <button
                onClick={() => onViewPlace(location)}
                className="flex w-full items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    Explore this place
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {sceneCount} scene{sceneCount !== 1 ? "s" : ""} filmed here
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
              </button>
            )}

            {/* 3D View CTA — temporarily disabled */}
            {/* {onView3D && (
              <button
                onClick={onView3D}
                className="flex w-full items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-left transition-colors hover:bg-cyan-500/10"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    View in 3D
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Photorealistic city model
                  </span>
                </div>
                <Box className="h-4 w-4 text-cyan-500" />
              </button>
            )} */}

            {/* Fiction info */}
            {fiction && (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Featured In
                </h3>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: DEFAULT_FICTION_ACCENT }}
                  >
                    <Film className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{fiction.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {fiction.year} &middot; {fiction.genre}
                      {fiction.author ? ` \u00B7 ${fiction.author}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
