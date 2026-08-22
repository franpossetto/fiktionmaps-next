"use client"

import dynamic from "next/dynamic"
import Image from "next/image"
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react"
import { Compass } from "lucide-react"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Location } from "@/src/locations/domain/location.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { City } from "@/src/cities/domain/city.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { ContributorProfileWithDate } from "@/src/contributions/domain/contribution.entity"
import { FictionDetailSectionHeading } from "@/components/fictions/fiction-detail-section-heading"
import { PlaceContributorsByline } from "@/components/fictions/place-contributors-byline"
import { PlaceShootEnvironmentBadge } from "@/components/places/place-shoot-environment-badge"
import { PlaceRelationKindBadge } from "@/components/places/place-relation-kind-badge"
import { PlaceContributeQuestions } from "@/components/places/place-contribute-questions"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import { cn } from "@/lib/utils"
import { ScenePreviewThumb } from "@/components/scenes/scene-preview-thumb"
import { publicFictionScenePath } from "@/lib/fictions/public-fiction-paths"

const FictionPlaceDirectionsMap = dynamic(
  () =>
    import("./fiction-place-directions-map").then((m) => ({
      default: m.FictionPlaceDirectionsMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[min(58vw,420px)] min-h-[280px] w-full animate-pulse rounded-xl border border-border/60 bg-muted/40 sm:min-h-[320px] sm:h-[400px]"
        aria-hidden
      />
    ),
  },
)

function MapSkeleton() {
  return (
    <div
      className="h-[min(58vw,420px)] min-h-[280px] w-full animate-pulse rounded-xl border border-border/60 bg-muted/40 sm:min-h-[320px] sm:h-[400px]"
      aria-hidden
    />
  )
}

/** Load Mapbox only when the directions block nears the viewport. */
function LazyFictionPlaceDirectionsMap(props: ComponentProps<typeof FictionPlaceDirectionsMap>) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: "240px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  return <div ref={ref}>{visible ? <FictionPlaceDirectionsMap {...props} /> : <MapSkeleton />}</div>
}

function hasValidPlaceCoordinates(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat === 0 && lng === 0) return false
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

/** Same pattern as filming locations list (`fiction-detail.tsx`). */
function googleMapsHref(coordsOk: boolean, lat: number, lng: number, addressQuery: string): string {
  if (coordsOk) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`
}

export interface FictionPlaceDetailViewProps {
  fiction: FictionWithMedia
  /** Slug segment for `/fictions/...` paths. */
  fictionPathSlug: string
  place: Place
  city: City | undefined
  exploreMapHref: string
  /** Sync props for preview / contribute; prefer Suspense slots on public page. */
  scenes?: Scene[]
  placeContributors?: ContributorProfileWithDate[]
  /** Deferred RSC slots (public place page). */
  contributorsSlot?: ReactNode
  relationshipsSlot?: ReactNode
  scenesSlot?: ReactNode
  /** Contribute wizard: same layout, no navigation away from the flow. */
  previewMode?: boolean
}

export function FictionPlaceDetailView({
  fiction,
  fictionPathSlug,
  place,
  city,
  exploreMapHref,
  scenes = [],
  placeContributors = [],
  contributorsSlot,
  relationshipsSlot,
  scenesSlot,
  previewMode = false,
}: FictionPlaceDetailViewProps) {
  const t = useTranslations("Fictions")
  const tMeta = useTranslations("Metadata")
  const geo: Location =
    place.location ?? {
      name: "",
      address: "",
      lat: 0,
      lng: 0,
      cityId: "",
      locationType: null,
      isLandmark: undefined,
    }
  const displayName = place.name.trim() || tMeta("unnamedPlace")
  const heroSrc = place.image?.trim() ? place.image.trim() : DEFAULT_FICTION_COVER
  const heroUnoptimized = heroSrc.startsWith("blob:")
  const coordsOk = hasValidPlaceCoordinates(geo.lat, geo.lng)
  const addressLine =
    geo.address?.trim() ||
    (city ? [city.name, city.country].filter(Boolean).join(", ") : "") ||
    ""

  const showDirectionsSection = coordsOk || Boolean(addressLine)

  const contributorsNode =
    contributorsSlot ??
    (placeContributors.length > 0 ? (
      <PlaceContributorsByline contributors={placeContributors} className="max-w-full" />
    ) : null)

  const scenesNode =
    scenesSlot ??
    (
      <section className="space-y-5">
        <FictionDetailSectionHeading
          title={t("placeDetailScenesHeading")}
          count={scenes.length}
        />

        {scenes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("placeDetailNoScenes")}</p>
        ) : (
          <ol className="divide-y divide-border/60 rounded-xl border border-border/40 bg-card/30">
            {scenes.map((scene, index) => {
              const timeLabel = scene.timestamp?.trim() || ""
              return (
                <li key={scene.id} className="px-4 py-4 sm:px-5 sm:py-5">
                  <Link
                    href={publicFictionScenePath(fictionPathSlug, scene.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-lg outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <p className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </p>
                    <ScenePreviewThumb scene={scene} className="h-16 w-20 sm:h-18 sm:w-24" sizes="96px" />
                    <div className="min-w-0 flex-1">
                      {timeLabel ? (
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {timeLabel}
                        </p>
                      ) : null}
                      <p
                        className={cn(
                          "text-base font-semibold leading-snug text-foreground sm:text-lg",
                          timeLabel ? "mt-1" : "",
                        )}
                      >
                        {scene.title}
                      </p>
                      {scene.description ? (
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{scene.description}</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    )

  return (
    <main
      className={
        previewMode
          ? "px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
          : "px-6 py-8 sm:px-8 lg:px-10"
      }
    >
      <div className="mx-auto w-full max-w-[920px]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <PageBreadcrumb
            ariaLabel={tMeta("breadcrumbNavAriaLabel")}
            className="min-w-0 flex-1 pr-2"
            items={
              previewMode
                ? [
                    { label: tMeta("breadcrumbFictions") },
                    { label: fiction.title },
                    { label: displayName },
                  ]
                : [
                    { label: tMeta("breadcrumbFictions"), href: "/fictions" },
                    { label: fiction.title, href: `/fictions/${fictionPathSlug}` },
                    { label: displayName },
                  ]
            }
          />
          {previewMode ? (
            <Button type="button" size="sm" variant="cta" disabled className="pointer-events-none opacity-80">
              <Compass className="h-4 w-4" />
              <span>{t("exploreMap")}</span>
            </Button>
          ) : (
            <Button asChild size="sm" variant="cta">
              <Link href={exploreMapHref}>
                <Compass className="h-4 w-4" />
                <span>{t("exploreMap")}</span>
              </Link>
            </Button>
          )}
        </div>

        <article className="space-y-6">
          <div className="flex flex-col">
            <header className="space-y-5 border-b border-border/60 pb-8">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {fiction.type === "tv-series"
                    ? t("typeTvSeries")
                    : fiction.type === "book"
                      ? t("typeBook")
                      : t("typeMovie")}
                </Badge>
                {city ? (
                  <span>
                    {city.name}
                    {city.country ? `, ${city.country}` : ""}
                  </span>
                ) : null}
                <PlaceRelationKindBadge value={place.relationKind} />
                {place.shootEnvironment ? (
                  <PlaceShootEnvironmentBadge value={place.shootEnvironment} />
                ) : null}
              </div>
              <h1 className="w-full text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl xl:text-[2.65rem]">
                {t("placeDetailCatchyHeading", {
                  placeName: displayName,
                  fictionName: fiction.title,
                })}
              </h1>
              {relationshipsSlot}
              <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border/60">
                <Image
                  src={heroSrc}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 920px"
                  priority
                  unoptimized={heroUnoptimized}
                />
              </div>
              {place.description ? (
                <p className="max-w-[75ch] text-base leading-8 text-muted-foreground">{place.description}</p>
              ) : null}
            </header>

            {contributorsNode ? (
              <div className="border-b border-border/60 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">{contributorsNode}</div>
                </div>
              </div>
            ) : null}
          </div>

          {showDirectionsSection ? (
            <section className="space-y-4 border-b border-border/60 pb-10" aria-labelledby="place-directions-heading">
              <FictionDetailSectionHeading
                id="place-directions-heading"
                title={t("placeDetailDirectionsHeading")}
                trailing={
                  previewMode ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled
                      className="pointer-events-none h-9 shrink-0 border-border bg-background px-3 text-sm opacity-80 shadow-none"
                    >
                      <Compass className="h-4 w-4" />
                      <span>{t("placeDetailGoToMap")}</span>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline" className="h-9 shrink-0 border-border bg-background px-3 text-sm shadow-none">
                      <Link href={exploreMapHref}>
                        <Compass className="h-4 w-4" />
                        <span>{t("placeDetailGoToMap")}</span>
                      </Link>
                    </Button>
                  )
                }
              />
              {coordsOk ? (
                <LazyFictionPlaceDirectionsMap
                  mapInstanceId={`fiction-place-directions-${place.id}`}
                  center={{ lat: geo.lat, lng: geo.lng }}
                  placeName={displayName}
                  imageSrc={heroSrc}
                />
              ) : null}
              {addressLine ? (
                <p className="text-sm leading-relaxed sm:text-base">
                  <a
                    href={googleMapsHref(coordsOk, geo.lat, geo.lng, addressLine)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    {addressLine}
                  </a>
                </p>
              ) : coordsOk ? (
                <p className="text-sm leading-relaxed sm:text-base">
                  <a
                    href={googleMapsHref(true, geo.lat, geo.lng, "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    {t("placeDetailOpenInGoogleMaps")}
                  </a>
                </p>
              ) : null}
            </section>
          ) : null}

          {scenesNode}

          {previewMode ? null : (
            <PlaceContributeQuestions fictionId={fiction.id} placeId={place.id} />
          )}
        </article>
      </div>
    </main>
  )
}
