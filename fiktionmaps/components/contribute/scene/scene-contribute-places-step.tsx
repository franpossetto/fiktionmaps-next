"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Loader2, MapPin, X } from "lucide-react"
import type { Place } from "@/src/places/domain/place.entity"
import { getApprovedFictionPlacesForContributeAction } from "@/src/places/infrastructure/next/place.actions"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { cn } from "@/lib/utils"

const INPUT_ROW =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

type SceneContributePlacesStepProps = {
  fictionId: string
  fictionTitle: string
  selectedPlaces: Place[]
  onChange: (places: Place[]) => void
  error?: string
  /** Places already linked to the target scene (shown disabled in the picker). */
  disabledPlaceIds?: string[]
}

export function SceneContributePlacesStep({
  fictionId,
  fictionTitle,
  selectedPlaces,
  onChange,
  error,
  disabledPlaceIds,
}: SceneContributePlacesStepProps) {
  const t = useTranslations("Contribute.scene")
  const [placeSearch, setPlaceSearch] = useState("")
  const [places, setPlaces] = useState<Place[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPlaceSearch("")
    setPlaces([])
    setPlacesLoading(true)
    void getApprovedFictionPlacesForContributeAction(fictionId)
      .then((rows) => {
        if (!cancelled) setPlaces(rows)
      })
      .finally(() => {
        if (!cancelled) setPlacesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fictionId])

  const selectedIds = useMemo(() => new Set(selectedPlaces.map((p) => p.id)), [selectedPlaces])
  const disabledIds = useMemo(() => new Set(disabledPlaceIds ?? []), [disabledPlaceIds])

  const listedPlaces = useMemo(() => {
    const q = placeSearch.trim().toLowerCase()
    return places.filter((p) => {
      if (selectedIds.has(p.id)) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.location.name.toLowerCase().includes(q)
    })
  }, [placeSearch, places, selectedIds])

  function addPlace(place: Place) {
    if (selectedIds.has(place.id) || disabledIds.has(place.id)) return
    onChange([...selectedPlaces, place])
  }

  function removePlace(placeId: string) {
    onChange(selectedPlaces.filter((p) => p.id !== placeId))
  }

  return (
    <div className="space-y-5">
      {fictionTitle ? (
        <p className="text-sm text-muted-foreground">{t("placeFictionContext", { title: fictionTitle })}</p>
      ) : null}

      <ContributeFieldWrapper label={t("stepPlaces")} required error={error}>
        <div className="space-y-4">
          {selectedPlaces.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {selectedPlaces.map((place) => (
                <li
                  key={place.id}
                  className="flex max-w-full items-center gap-2 rounded-full bg-muted/50 py-1 pl-1 pr-2"
                >
                  <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
                    <Image
                      src={place.image?.trim() || DEFAULT_FICTION_COVER}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="28px"
                    />
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{place.name}</span>
                  <button
                    type="button"
                    className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label={t("placeRemoveAria", { name: place.name })}
                    onClick={() => removePlace(place.id)}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("placeSelectEmpty")}</p>
          )}

          <input
            type="search"
            value={placeSearch}
            onChange={(e) => setPlaceSearch(e.target.value)}
            placeholder={t("placeSearchPlaceholder")}
            className={INPUT_ROW}
            disabled={placesLoading}
          />

          {placesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : listedPlaces.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {places.length === 0 ? t("placeNoPlaces") : t("placeNoMorePlaces")}
            </p>
          ) : (
            <div className="max-h-[min(50vh,22rem)] space-y-0.5 overflow-y-auto">
              {listedPlaces.map((place) => {
                const disabled = disabledIds.has(place.id)
                return (
                  <button
                    key={place.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => addPlace(place)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors",
                      disabled ? "cursor-not-allowed opacity-55" : "hover:bg-muted/60",
                    )}
                  >
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
                        {disabled ? t("placeAlreadyOnScene") : place.location.name}
                      </span>
                    </span>
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </ContributeFieldWrapper>
    </div>
  )
}
