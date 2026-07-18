"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import { ChevronRight, Compass, ImageOff, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { FictionCard } from "@/components/fictions/fiction-card"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

function FictionNameList({
  fictions,
  and,
}: {
  fictions: FictionWithMedia[]
  and: string
}) {
  return (
    <>
      {fictions.map((f, i) => (
        <span key={f.id}>
          {i > 0 && i < fictions.length - 1 && ", "}
          {i === fictions.length - 1 && i > 0 && ` ${and} `}
          <Link
            href={`/fictions/${f.slug}`}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {f.title}
          </Link>
        </span>
      ))}
    </>
  )
}

function CityIntroCallout({
  city,
  fictions,
  placeCounts,
  totalPlaces,
}: {
  city: City
  fictions: FictionWithMedia[]
  placeCounts: Record<string, number>
  totalPlaces: number
}) {
  const t = useTranslations("Cities")

  const contributeLink = (
    <Link
      href="/contribute/place"
      className="text-foreground underline underline-offset-2 transition-colors hover:text-muted-foreground"
    >
      {t("contributePlaceLink")}
    </Link>
  )

  // Case 1: nothing mapped yet
  if (totalPlaces === 0) {
    return (
      <p className="text-base text-muted-foreground">
        {t("cityIntroNoPlaces", { city: city.name })}{" "}
        {t("cityIntroContributeInvite")}{" "}
        {contributeLink}.
      </p>
    )
  }

  // Pick featured fictions — prefer those with places, up to 3
  const withPlaces = fictions.filter((f) => (placeCounts[f.id] ?? 0) > 0)
  const featured = (withPlaces.length > 0 ? withPlaces : fictions).slice(0, 3)

  // Case 2: 1–2 fictions total → name them all + invite to contribute
  if (fictions.length <= 2) {
    return (
      <p className="text-base text-muted-foreground">
        <FictionNameList fictions={featured} and={t("cityIntroAnd")} />{" "}
        {t("cityIntroFewFictionsFilmedIn", { city: city.name })}{" "}
        {t("cityIntroMoreToExplore")}{" "}
        {t("cityIntroContributeInvite")}{" "}
        {contributeLink}.
      </p>
    )
  }

  // Case 3: 3+ fictions → highlight 3 of them
  return (
    <p className="text-base text-muted-foreground">
      {t("cityIntroManyFictionsPrefix", { city: city.name })}{" "}
      <FictionNameList fictions={featured} and={t("cityIntroAnd")} />.
    </p>
  )
}

interface CityDetailProps {
  city: City
  fictions: FictionWithMedia[]
  placeCounts: Record<string, number>
  exploreMapHref: string
  rightAside?: ReactNode
}

export function CityDetail({ city, fictions, placeCounts, exploreMapHref, rightAside }: CityDetailProps) {
  const t = useTranslations("Cities")
  const tMeta = useTranslations("Metadata")

  const totalPlaces = fictions.reduce((sum, f) => sum + (placeCounts[f.id] ?? 0), 0)
  const heroImageSrc = city.image_url?.trim() || null

  return (
    <AppDetailRailsShell rightAside={rightAside}>
      <main className="px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-[920px]">
          {/* Breadcrumb + CTA */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <PageBreadcrumb
              ariaLabel={tMeta("breadcrumbNavAriaLabel")}
              className="min-w-0 flex-1 pr-2"
              items={[
                { label: tMeta("breadcrumbCities") },
                { label: city.name },
              ]}
            />
            <Button asChild size="sm" variant="cta">
              <Link href={exploreMapHref}>
                <Compass className="h-4 w-4" />
                <span>{t("exploreMap")}</span>
              </Link>
            </Button>
          </div>

          <article className="space-y-8">
            <header className="space-y-5 border-b border-border/60 pb-8">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{city.country}</span>
              </div>

              <h1 className="w-full text-balance break-words text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl xl:text-[3.25rem]">
                {t("cityDetailHeadline", { city: city.name })}
              </h1>

              {/* Hero — real photo or placeholder */}
              <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                {heroImageSrc ? (
                  <Image
                    src={heroImageSrc}
                    alt={city.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 920px"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/40">
                    <ImageOff className="h-10 w-10" />
                    <p className="text-sm">No photo added yet</p>
                  </div>
                )}
              </div>

            </header>

            <CityIntroCallout
              city={city}
              fictions={fictions}
              placeCounts={placeCounts}
              totalPlaces={totalPlaces}
            />

            <section className="space-y-5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="h-7 w-1 rounded-full bg-yellow-500" aria-hidden />
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                    {t("fictionsHeading")}
                  </h2>
                  <span className="text-base font-medium text-muted-foreground">
                    {fictions.length}
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-1.5 text-base text-muted-foreground">
                  {t("fictionsInCity", { city: city.name })}
                </p>
              </div>

              {fictions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noFictionsInCity")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {fictions.map((fiction) => (
                    <FictionCard
                      key={fiction.id}
                      fiction={fiction}
                      locationCount={placeCounts[fiction.id] ?? 0}
                      href={`/fictions/${fiction.slug}`}
                    />
                  ))}
                </div>
              )}
            </section>
          </article>
        </div>
      </main>
    </AppDetailRailsShell>
  )
}
