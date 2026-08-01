"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { GripVertical } from "lucide-react"
import type { Place } from "@/src/places/domain/place.entity"
import { MapProvider } from "@/lib/map"
import {
  SceneContributeRouteMap,
  placesRoutePoints,
} from "@/components/contribute/scene/scene-contribute-route-map"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { cn } from "@/lib/utils"

type SceneContributePlacesOrderStepProps = {
  fictionId: string
  selectedPlaces: Place[]
  onChange: (places: Place[]) => void
  mapId?: string
}

export function SceneContributePlacesOrderStep({
  fictionId,
  selectedPlaces,
  onChange,
  mapId = "contribute-scene-order-map",
}: SceneContributePlacesOrderStepProps) {
  const t = useTranslations("Contribute.scene")
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const routePoints = placesRoutePoints(selectedPlaces)

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= selectedPlaces.length || to >= selectedPlaces.length) {
      return
    }
    const next = [...selectedPlaces]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    onChange(next)
  }

  return (
    <div className="w-full space-y-6">
      <p className="text-sm text-muted-foreground">{t("placeOrderHint")}</p>

      <div className="relative h-[min(58vw,380px)] min-h-[260px] w-full overflow-hidden rounded-xl bg-muted sm:min-h-[300px] sm:h-[360px]">
        <MapProvider libraries={[]}>
          <SceneContributeRouteMap
            mapId={mapId}
            fictionId={fictionId}
            selectedPlaces={selectedPlaces}
          />
        </MapProvider>
        {selectedPlaces.length > 0 && routePoints.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 px-4 text-center text-xs text-muted-foreground">
            {t("placeRouteMapNoCoords")}
          </div>
        ) : null}
      </div>

      <ol className="space-y-1">
        {selectedPlaces.map((place, index) => (
          <li
            key={place.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => {
              if (dragIndex != null && overIndex != null) reorder(dragIndex, overIndex)
              setDragIndex(null)
              setOverIndex(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (overIndex !== index) setOverIndex(index)
            }}
            className={cn(
              "flex cursor-grab items-center gap-3 rounded-lg px-1 py-2 transition-colors active:cursor-grabbing",
              overIndex === index && dragIndex !== index && "bg-muted/70",
              dragIndex === index && "opacity-50",
            )}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {index + 1}
            </span>
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
