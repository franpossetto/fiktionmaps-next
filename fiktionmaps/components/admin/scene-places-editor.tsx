"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import type { Place } from "@/src/places/domain/place.entity"
import type { ScenePlace } from "@/src/scenes/domain/scene.entity"
import {
  linkScenePlaceAction,
  unlinkScenePlaceAction,
} from "@/src/scenes/infrastructure/next/scene.actions"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { Button } from "@/components/ui/button"

function findPlace(places: Place[], placeId: string): Place | undefined {
  return places.find((item) => item.placeId === placeId)
}

function placeLabel(places: Place[], placeId: string): string {
  const place = findPlace(places, placeId)
  return place?.name || place?.location.name || placeId
}

function PlaceThumb({ place }: { place: Place | undefined }) {
  return (
    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
      <Image
        src={place?.image?.trim() || DEFAULT_FICTION_COVER}
        alt=""
        fill
        className="object-cover"
        sizes="40px"
      />
    </span>
  )
}

export interface ScenePlacesEditorProps {
  sceneId: string
  fictionId: string
  linkedPlaces: ScenePlace[]
  places: Place[]
  disabled?: boolean
  onLinkedChange: (places: ScenePlace[]) => void
  onError: (message: string | null) => void
}

export function ScenePlacesEditor({
  sceneId,
  fictionId,
  linkedPlaces,
  places,
  disabled = false,
  onLinkedChange,
  onError,
}: ScenePlacesEditorProps) {
  const t = useTranslations("Scenes")
  const [selectedPlaceId, setSelectedPlaceId] = useState("")
  const [busy, setBusy] = useState<"add" | string | null>(null)

  const availablePlaces = useMemo(() => {
    const linked = new Set(linkedPlaces.map((place) => place.placeId))
    return places
      .filter((place) => place.fictionId === fictionId && !linked.has(place.placeId))
      .sort((a, b) => placeLabel(places, a.placeId).localeCompare(placeLabel(places, b.placeId)))
  }, [fictionId, linkedPlaces, places])

  const addPlace = async () => {
    if (!selectedPlaceId || busy) return
    setBusy("add")
    onError(null)
    try {
      const result = await linkScenePlaceAction({ sceneId, placeId: selectedPlaceId })
      if (!result.success) throw new Error(result.error)
      onLinkedChange(
        [...linkedPlaces, result.scenePlace].sort((a, b) => a.sortOrder - b.sortOrder),
      )
      setSelectedPlaceId("")
    } catch (err) {
      onError(err instanceof Error ? err.message : t("scenePlacesAddFailed"))
    } finally {
      setBusy(null)
    }
  }

  const removePlace = async (placeId: string) => {
    if (busy) return
    setBusy(placeId)
    onError(null)
    try {
      const result = await unlinkScenePlaceAction({ sceneId, placeId })
      if (!result.success) throw new Error(result.error)
      onLinkedChange(linkedPlaces.filter((place) => place.placeId !== placeId))
    } catch (err) {
      onError(err instanceof Error ? err.message : t("scenePlacesRemoveFailed"))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-foreground">{t("scenePlacesHeading")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("scenePlacesHint")}</p>
      </div>

      {linkedPlaces.length === 0 ? (
        <p className="rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground">
          {t("scenePlacesEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {linkedPlaces.map((link) => (
            <li
              key={link.placeId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                <PlaceThumb place={findPlace(places, link.placeId)} />
                <span className="min-w-0 truncate text-sm text-foreground">
                  {placeLabel(places, link.placeId)}
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || busy != null}
                onClick={() => void removePlace(link.placeId)}
              >
                {busy === link.placeId ? <Loader2 className="h-4 w-4 animate-spin" /> : t("scenePlacesRemove")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {availablePlaces.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("scenePlacesNoneAvailable")}</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {selectedPlaceId ? <PlaceThumb place={findPlace(places, selectedPlaceId)} /> : null}
          <select
            value={selectedPlaceId}
            disabled={disabled || busy != null}
            onChange={(event) => setSelectedPlaceId(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            aria-label={t("scenePlacesSelect")}
          >
            <option value="">{t("scenePlacesSelect")}</option>
            {availablePlaces.map((place) => (
              <option key={place.placeId} value={place.placeId}>
                {place.name || place.location.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || busy != null || !selectedPlaceId}
            onClick={() => void addPlace()}
          >
            {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("scenePlacesAdd")}
          </Button>
        </div>
      )}
    </section>
  )
}
