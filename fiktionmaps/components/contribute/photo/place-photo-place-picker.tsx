"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import type { Place } from "@/src/places/domain/place.entity"
import { getApprovedFictionPlacesForContributeAction } from "@/src/places/infrastructure/next/place.actions"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { cn } from "@/lib/utils"

const INPUT_ROW =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

type PlacePhotoPlacePickerProps = {
  fictionId: string
  fictionTitle: string
  placeId: string
  onSelect: (place: Place) => void
  error?: string
  /** Place ids already linked to the target scene (or otherwise unavailable). */
  excludePlaceIds?: string[]
}

export function PlacePhotoPlacePicker({
  fictionId,
  fictionTitle,
  placeId,
  onSelect,
  error,
  excludePlaceIds,
}: PlacePhotoPlacePickerProps) {
  const t = useTranslations("Contribute.photo")
  const [placeSearch, setPlaceSearch] = useState("")
  const [places, setPlaces] = useState<Place[]>([])
  const [placesLoading, setPlacesLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPlaceSearch("")
    setPlaces([])
    setPlacesLoading(true)
    void getApprovedFictionPlacesForContributeAction(fictionId).then((rows) => {
      if (!cancelled) setPlaces(rows)
    }).finally(() => {
      if (!cancelled) setPlacesLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fictionId])

  const filteredPlaces = useMemo(() => {
    const excluded = new Set(excludePlaceIds ?? [])
    const available = excluded.size === 0 ? places : places.filter((p) => !excluded.has(p.id))
    const q = placeSearch.trim().toLowerCase()
    if (!q) return available
    return available.filter((p) => {
      const name = p.name.toLowerCase()
      const loc = p.location.name.toLowerCase()
      return name.includes(q) || loc.includes(q)
    })
  }, [excludePlaceIds, placeSearch, places])

  return (
    <div className="space-y-5">
      {fictionTitle ? (
        <p className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {t("fictionContext", { title: fictionTitle })}
        </p>
      ) : null}
      <input
        type="search"
        value={placeSearch}
        onChange={(e) => setPlaceSearch(e.target.value)}
        placeholder={t("placeSearchPlaceholder")}
        className={INPUT_ROW}
        disabled={placesLoading}
      />
      <ContributeFieldWrapper label={t("stepPlace")} required error={error}>
        {placesLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : filteredPlaces.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("noPlaces")}</p>
        ) : (
          <div className="max-h-[min(50vh,22rem)] space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {filteredPlaces.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => onSelect(place)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                  placeId === place.id ? "bg-primary/10" : "hover:bg-muted/60",
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
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{place.location.name}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </ContributeFieldWrapper>
    </div>
  )
}
