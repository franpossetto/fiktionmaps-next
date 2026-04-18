"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Globe } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { MAPBOX_ACCESS_TOKEN } from "@/lib/map/mapbox/styles"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import {
  getUserCityCheckinsAction,
  getUserPlaceCheckinsEnrichedAction,
  type EnrichedPlaceCheckin,
} from "@/src/checkins/infrastructure/next/checkin.actions"
import type { CityCheckin } from "@/src/checkins/infrastructure/next/checkin.actions"
import type { City } from "@/src/cities/domain/city.entity"
import {
  PlacesSidebarRow,
  PROFILE_SEE_ALL_THRESHOLD,
  SidebarCard,
  SidebarSectionLoading,
} from "./profile-sidebar-sections"
type UnifiedCheckin =
  | { kind: "city"; data: CityCheckin; cityName: string; country: string }
  | { kind: "place"; data: EnrichedPlaceCheckin }

interface CheckinsListProps {
  /** Collapsed preview length when total exceeds `PROFILE_SEE_ALL_THRESHOLD`. Defaults to that threshold. */
  limit?: number
  cityMap?: Map<string, City>
  cityCheckins?: CityCheckin[]
  placeCheckins?: EnrichedPlaceCheckin[]
}

function cityCheckinMapUrl(lat: number, lng: number): string | null {
  if (!MAPBOX_ACCESS_TOKEN) return null
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ef4444(${lng},${lat})/${lng},${lat},11,0/88x88@2x?access_token=${MAPBOX_ACCESS_TOKEN}&logo=false&attribution=false`
}

function placeCheckinThumbUrl(c: EnrichedPlaceCheckin): string {
  return c.placeImage?.trim() || c.fictionCover?.trim() || DEFAULT_FICTION_COVER
}

export function CheckinsList({
  limit = PROFILE_SEE_ALL_THRESHOLD,
  cityMap: externalCityMap,
  cityCheckins: externalCityCheckins,
  placeCheckins: externalPlaceCheckins,
}: CheckinsListProps) {
  const t = useTranslations("Checkins")
  const tProfile = useTranslations("Profile")
  const router = useRouter()

  const [cityCheckins, setCityCheckins] = useState<CityCheckin[]>(externalCityCheckins ?? [])
  const [placeCheckins, setPlaceCheckins] = useState<EnrichedPlaceCheckin[]>(externalPlaceCheckins ?? [])
  const [cities, setCities] = useState<Map<string, City>>(externalCityMap ?? new Map())
  const [loading, setLoading] = useState(!externalCityCheckins && !externalPlaceCheckins)
  const [showAll, setShowAll] = useState(false)

  const relativeDate = useCallback(
    (iso: string): string => {
      const d = new Date(iso)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffDays === 0) return t("today")
      if (diffDays === 1) return t("yesterday")
      if (diffDays < 7) return t("daysAgo", { days: diffDays })

      return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
    },
    [t],
  )

  const fetchData = useCallback(async () => {
    if (externalCityCheckins !== undefined && externalPlaceCheckins !== undefined) return
    setLoading(true)
    const [cityRes, placeRes] = await Promise.all([
      externalCityCheckins !== undefined ? null : getUserCityCheckinsAction(),
      externalPlaceCheckins !== undefined ? null : getUserPlaceCheckinsEnrichedAction(),
    ])
    if (cityRes?.data) setCityCheckins(cityRes.data)
    if (placeRes?.data) setPlaceCheckins(placeRes.data)
    setLoading(false)
  }, [externalCityCheckins, externalPlaceCheckins])

  useEffect(() => {
    if (externalCityCheckins !== undefined) setCityCheckins(externalCityCheckins)
  }, [externalCityCheckins])

  useEffect(() => {
    if (externalPlaceCheckins !== undefined) setPlaceCheckins(externalPlaceCheckins)
  }, [externalPlaceCheckins])

  useEffect(() => {
    if (externalCityMap !== undefined) setCities(externalCityMap)
  }, [externalCityMap])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const unified: UnifiedCheckin[] = [
    ...cityCheckins.map((c) => {
      const city = cities.get(c.cityId)
      return {
        kind: "city" as const,
        data: c,
        cityName: city?.name ?? c.cityId,
        country: city?.country ?? "",
        sortKey: c.checkedAt,
      }
    }),
    ...placeCheckins.map((c) => ({
      kind: "place" as const,
      data: c,
      sortKey: c.checkedAt,
    })),
  ]
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .map(({ sortKey: _s, ...rest }) => rest as UnifiedCheckin)

  const showSeeAll = unified.length > PROFILE_SEE_ALL_THRESHOLD
  const visible =
    !showSeeAll
      ? unified
      : showAll
        ? unified
        : unified.slice(0, limit)
  const hasMore = showSeeAll

  if (loading) {
    return (
      <SidebarSectionLoading title={tProfile("checkIns")} message={t("loadingCheckins")} />
    )
  }

  return (
    <>
      <SidebarCard
        title={tProfile("checkIns")}
        ctaLabel={showSeeAll ? tProfile("seeAll") : undefined}
        emptyMessage={unified.length === 0 ? t("noCheckins") : undefined}
      >
        {unified.length === 0
          ? null
          : visible.map((item) => {
              if (item.kind === "city") {
                const c = item.data
                const city = cities.get(c.cityId)
                const mapUrl =
                  city && Number.isFinite(city.lat) && Number.isFinite(city.lng)
                    ? cityCheckinMapUrl(city.lat, city.lng)
                    : null
                const when = relativeDate(c.checkedAt)
                const subtitle = [
                  t("cityCheckinLabel"),
                  item.country || undefined,
                  when,
                ]
                  .filter(Boolean)
                  .join(" · ")

                return (
                  <PlacesSidebarRow
                    key={`city-${c.id}`}
                    title={item.cityName}
                    subtitle={subtitle}
                    leading={
                      mapUrl ? (
                        <Image
                          src={mapUrl}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <Globe className="h-5 w-5 text-muted-foreground" aria-hidden />
                        </span>
                      )
                    }
                  />
                )
              }

              const c = item.data
              const when = relativeDate(c.checkedAt)
              const subtitleParts = [c.fictionTitle, c.placeAddress, when].filter(Boolean)
              return (
                <button
                  key={`place-${c.id}`}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/fiction/${encodeURIComponent(c.fictionId)}/place/${encodeURIComponent(c.placeId)}`,
                    )
                  }
                  className="block w-full text-left transition-colors hover:bg-muted/30"
                >
                  <PlacesSidebarRow
                    title={c.placeName}
                    subtitle={subtitleParts.join(" · ")}
                    leading={
                      <Image
                        src={placeCheckinThumbUrl(c)}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    }
                  />
                </button>
              )
            })}
      </SidebarCard>
      {hasMore && unified.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll((p) => !p)}
        >
          {showAll ? t("showLess") : t("showAll")}
        </Button>
      )}
    </>
  )
}
