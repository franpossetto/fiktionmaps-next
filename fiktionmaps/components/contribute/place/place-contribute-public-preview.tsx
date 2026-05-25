"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { FictionPlaceDetailView } from "@/components/fictions/fiction-place-detail-view"
import { FictionContributePreviewSidebar } from "@/components/contribute/fiction/fiction-contribute-preview-sidebar"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import { cn } from "@/lib/utils"

const PREVIEW_PLACE_ID = "contribute-place-preview"

export interface PlaceContributePublicPreviewProps {
  fiction: FictionWithMedia
  cities: City[]
  summaryText?: string | null
  placeName: string
  locationName: string
  description: string
  address: string
  formattedAddress: string
  latitude: number
  longitude: number
  cityId: string
  locationType: string
  isLandmark: boolean
  imagePreviewUrl: string | null
  className?: string
}

export function PlaceContributePublicPreview({
  fiction,
  cities,
  summaryText,
  placeName,
  locationName,
  description,
  address,
  formattedAddress,
  latitude,
  longitude,
  cityId,
  locationType,
  isLandmark,
  imagePreviewUrl,
  className,
}: PlaceContributePublicPreviewProps) {
  const t = useTranslations("Contribute.place")

  const city = useMemo(() => cities.find((c) => c.id === cityId), [cities, cityId])

  const location = useMemo<Place>(() => {
    const addressLine = formattedAddress.trim() || address.trim()
    return {
      id: PREVIEW_PLACE_ID,
      placeId: PREVIEW_PLACE_ID,
      name: placeName.trim() || "Place",
      slug: "preview",
      fictionId: fiction.id,
      location: {
        name: locationName.trim(),
        address: addressLine,
        lat: latitude,
        lng: longitude,
        cityId: cityId.trim(),
        locationType: locationType.trim() || null,
        isLandmark,
      },
      image: imagePreviewUrl?.trim() ?? "",
      videoUrl: "",
      description: description.trim(),
      sceneDescription: "",
    }
  }, [
    address,
    cityId,
    description,
    fiction.id,
    formattedAddress,
    imagePreviewUrl,
    isLandmark,
    latitude,
    locationName,
    locationType,
    longitude,
    placeName,
  ])

  const fictionPathSlug = fiction.slug.trim()
  const exploreMapHref = `/map?fiction=${encodeURIComponent(fiction.id)}&place=${PREVIEW_PLACE_ID}`

  const sidebarSummary =
    summaryText?.trim() ||
    (fiction.description?.trim()
      ? fiction.description.trim().length > 160
        ? `${fiction.description.trim().slice(0, 157)}…`
        : fiction.description.trim()
      : undefined)

  const fictionCover =
    fiction.coverImage?.trim() || fiction.coverImageLarge?.trim() || null

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div className="border-b border-border/50 bg-muted/20 px-3 py-2 text-center text-xs font-medium text-muted-foreground sm:text-sm">
        {t("previewRibbon")}
      </div>
      <div className="h-[min(72vh,52rem)] min-h-[22rem] w-full max-w-full">
        <AppDetailRailsShell
          leftAside={
            <FictionContributePreviewSidebar
              title={fiction.title}
              type={fiction.type}
              year={fiction.year}
              genre={fiction.genre ?? ""}
              creditLine={fiction.author}
              coverSrc={fictionCover}
              summaryText={sidebarSummary}
            />
          }
        >
          <FictionPlaceDetailView
            fiction={fiction}
            fictionPathSlug={fictionPathSlug}
            place={location}
            city={city}
            scenes={[]}
            exploreMapHref={exploreMapHref}
            placeContributors={[]}
            previewMode
          />
        </AppDetailRailsShell>
      </div>
    </div>
  )
}
