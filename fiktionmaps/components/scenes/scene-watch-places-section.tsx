"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { Place } from "@/src/places/domain/place.entity"
import { MapProvider } from "@/lib/map"
import {
  SceneContributeRouteMap,
  placesRoutePoints,
} from "@/components/contribute/scene/scene-contribute-route-map"
import { FictionDetailSectionHeading } from "@/components/fictions/fiction-detail-section-heading"
import { Button } from "@/components/ui/button"
import { publicFictionPlacePath } from "@/lib/fictions/public-fiction-paths"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { cn } from "@/lib/utils"

type SceneWatchPlacesSectionProps = {
  fictionId: string
  fictionPathSlug: string
  places: Place[]
}

export function SceneWatchPlacesSection({
  fictionId,
  fictionPathSlug,
  places,
}: SceneWatchPlacesSectionProps) {
  const t = useTranslations("Fictions")
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)
  const [mapUnlocked, setMapUnlocked] = useState(false)
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  useEffect(() => {
    if (!focusedPlaceId) return
    itemRefs.current.get(focusedPlaceId)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    })
  }, [focusedPlaceId])

  if (places.length === 0) return null

  const routePoints = placesRoutePoints(places)

  return (
    <section className="space-y-5" aria-labelledby="scene-watch-places-heading">
      <FictionDetailSectionHeading
        id="scene-watch-places-heading"
        title={t("sceneWatchPlacesHeading")}
        count={places.length}
        description={
          places.length > 1
            ? t("sceneWatchPlacesRouteHint", { count: places.length })
            : t("sceneWatchPlacesCount", { count: 1 })
        }
      />

      <div className="relative min-h-[240px] h-[min(52vw,320px)] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/20 sm:min-h-[280px] sm:h-[300px]">
        <MapProvider libraries={[]}>
          <SceneContributeRouteMap
            mapId="scene-watch-places-map"
            fictionId={fictionId}
            selectedPlaces={places}
            interactive={mapUnlocked}
            focusPlaceId={focusedPlaceId}
            focusZoom={16}
            fitPadding={40}
            fitMaxZoom={17}
            allowZoomInLevels={1}
            onPlaceSelect={mapUnlocked ? setFocusedPlaceId : undefined}
          />
        </MapProvider>
        {!mapUnlocked && routePoints.length > 0 ? (
          <button
            type="button"
            onClick={() => setMapUnlocked(true)}
            className="absolute inset-0 z-[5] cursor-pointer bg-transparent"
            aria-label={t("sceneWatchPlacesMapUnlock")}
          />
        ) : null}
        {routePoints.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 px-4 text-center text-xs text-muted-foreground">
            {t("sceneWatchPlacesMapNoCoords")}
          </div>
        ) : null}
      </div>

      <ol className="space-y-1">
        {places.map((place, index) => {
          const isFocused = place.id === focusedPlaceId
          return (
            <li
              key={place.id}
              ref={(node) => {
                if (node) itemRefs.current.set(place.id, node)
                else itemRefs.current.delete(place.id)
              }}
            >
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-1 py-2 transition-colors",
                  isFocused ? "bg-muted/80" : "hover:bg-muted/70",
                )}
              >
                <button
                  type="button"
                  onClick={() => setFocusedPlaceId(place.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {places.length > 1 ? (
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        isFocused
                          ? "bg-primary text-primary-foreground"
                          : "bg-foreground text-background",
                      )}
                    >
                      {index + 1}
                    </span>
                  ) : null}
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image
                      src={place.image?.trim() || DEFAULT_FICTION_COVER}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {place.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {place.location.name}
                    </span>
                  </span>
                </button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-9 shrink-0 border-border bg-background px-3 text-sm shadow-none"
                >
                  <Link href={publicFictionPlacePath(fictionPathSlug, place.slug)}>
                    {t("visit")}
                  </Link>
                </Button>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
