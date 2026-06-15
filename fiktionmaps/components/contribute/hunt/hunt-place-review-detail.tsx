"use client"

import { useTranslations } from "next-intl"
import type { HuntPlace } from "@/src/hunts/domain/hunt.types"
import type { LatLng } from "@/lib/map/types"
import { Badge } from "@/components/ui/badge"
import { HuntPlaceVerificationPanel } from "./hunt-place-verification-panel"
import { HuntDuplicateBanner } from "./hunt-duplicate-banner"

export interface HuntPlaceReviewDetailProps {
  place: HuntPlace
  index: number
  totalPlaces: number
  coords: LatLng | null
  coordsAdjusted: boolean
  savedPanoId?: string | null
  onCoordsChange: (coords: LatLng) => void
  onCoordsReset: () => void
  onPanoResolved?: (panoId: string) => void
}

function formatPlaceAddress(place: HuntPlace): string {
  return [place.address, place.city, place.country].filter(Boolean).join(", ")
}

export function HuntPlaceReviewDetail({
  place,
  index,
  totalPlaces,
  coords,
  coordsAdjusted,
  savedPanoId,
  onCoordsChange,
  onCoordsReset,
  onPanoResolved,
}: HuntPlaceReviewDetailProps) {
  const t = useTranslations("Contribute.huntReview")
  const isDuplicate = place.duplicate_of !== null
  const description = place.description.trim() || t("noDescription")
  const formattedAddress = formatPlaceAddress(place)
  const locationLine = [place.city, place.country].filter(Boolean).join(", ")

  return (
    <article className="space-y-6 pb-6">
      <header className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {t("locationProgress", { current: index + 1, total: totalPlaces })}
          </Badge>
          {locationLine ? <span>{locationLine}</span> : null}
        </div>

        <h1 className="w-full text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl xl:text-[2.65rem]">
          {place.name}
        </h1>

        {(isDuplicate || coordsAdjusted) && (
          <div className="flex flex-wrap gap-1.5">
            {isDuplicate && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                Possible duplicate
              </span>
            )}
            {coordsAdjusted && (
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
                Pin adjusted
              </span>
            )}
          </div>
        )}

        {isDuplicate && (
          <HuntDuplicateBanner
            newPlace={{
              name: place.name,
              address: place.address,
              city: place.city,
              country: place.country,
              lat: place.lat,
              lng: place.lng,
            }}
            duplicateOf={place.duplicate_of!}
          />
        )}
      </header>

      {coords ? (
        <HuntPlaceVerificationPanel
          mapId={`hunt-verify-${index}`}
          latitude={coords.lat}
          longitude={coords.lng}
          placeName={place.name}
          description={description}
          formattedAddress={formattedAddress}
          coordsAdjusted={coordsAdjusted}
          savedPanoId={savedPanoId}
          onCoordsChange={onCoordsChange}
          onCoordsReset={onCoordsReset}
          onPanoResolved={onPanoResolved}
        />
      ) : (
        <div className="mt-6 space-y-5">
          <p className="rounded-xl border border-border/60 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            {t("noCoords")}
          </p>
          <p className="max-w-[75ch] text-base leading-8 text-muted-foreground">{description}</p>
        </div>
      )}
    </article>
  )
}
