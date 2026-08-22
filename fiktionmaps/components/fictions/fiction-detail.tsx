import Image from "next/image"
import { Compass, MapPin } from "lucide-react"
import { getFormatter, getTranslations } from "next-intl/server"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FictionDetailPlacesEmpty } from "@/components/fictions/fiction-detail-places-empty"
import { FictionDetailSectionHeading } from "@/components/fictions/fiction-detail-section-heading"
import { FictionDetailCredits } from "@/components/fictions/fiction-detail-credits"
import { FictionInterestTags, type FictionInterestTagItem } from "@/components/fictions/fiction-interest-tags"
import { FictionDetailLikeButton } from "@/components/fictions/fiction-detail-like-button"
import { FictionDetailPlaceLikeButton } from "@/components/fictions/fiction-detail-place-like-button"
import { FictionDetailRecentTracker } from "@/components/fictions/fiction-detail-recent-tracker"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { City } from "@/src/cities/domain/city.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { PlaceRelationship } from "@/src/place-relationships/domain/place-relationship.entity"
import type { FictionPerson } from "@/src/persons/domain/person.entity"
import type { ReactNode } from "react"

export interface FictionDetailProps {
  fiction: FictionWithMedia
  initialPlaces: Place[]
  initialCities: City[]
  /** Composite groups among these places, to cluster them in the list. */
  compositeGroups?: PlaceRelationship[]
  initialLikeCount: number
  /** From RSC session when available. */
  initialLiked?: boolean
  /** Shown in main column below `xl` (right rail is `xl`+ only). */
  fictionInterestTags?: FictionInterestTagItem[]
  credits?: FictionPerson[]
  /** Deferred recommendations (Suspense slot) rendered after places list. */
  recommendationsSlot?: ReactNode
}

/** Server Component: hero + copy + places SSR; likes are client islands. */
export async function FictionDetail({
  fiction,
  initialPlaces,
  initialCities,
  compositeGroups = [],
  initialLikeCount,
  initialLiked = false,
  fictionInterestTags = [],
  credits = [],
  recommendationsSlot,
}: FictionDetailProps) {
  const t = await getTranslations("Fictions")
  const tMeta = await getTranslations("Metadata")
  const format = await getFormatter()

  const cityById = new Map(initialCities.map((city) => [city.id, city]))
  const locationRows = initialPlaces.map((location, index) => ({
    index: index + 1,
    location,
    city: cityById.get(location.location.cityId),
  }))

  type LocationRow = (typeof locationRows)[number]

  // Cluster composite places (same real-world spot, same fiction) under one heading.
  const groupByPlaceId = new Map<string, PlaceRelationship>()
  for (const group of compositeGroups) {
    for (const member of group.members) {
      if (!groupByPlaceId.has(member.placeId)) groupByPlaceId.set(member.placeId, group)
    }
  }

  type ListItem =
    | { kind: "place"; row: LocationRow }
    | { kind: "group"; group: PlaceRelationship; rows: LocationRow[] }
  const listItems: ListItem[] = []
  const renderedGroupIds = new Set<string>()
  for (const row of locationRows) {
    const group = groupByPlaceId.get(row.location.id)
    if (!group) {
      listItems.push({ kind: "place", row })
      continue
    }
    if (renderedGroupIds.has(group.id)) continue
    renderedGroupIds.add(group.id)
    const groupMemberIds = new Set(group.members.map((m) => m.placeId))
    const rows = locationRows.filter((r) => groupMemberIds.has(r.location.id))
    // A lone member (sibling not in this fiction's public list) reads better as a plain row.
    if (rows.length < 2) {
      listItems.push({ kind: "place", row })
      continue
    }
    listItems.push({ kind: "group", group, rows })
  }

  const renderPlaceRow = ({ location, city }: LocationRow, displayIndex: number) => {
    const googleMapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.location.lat},${location.location.lng}`)}`
    return (
      <div className="flex items-center gap-4">
        <Link
          href={`/fictions/${pathSlug}/places/${location.slug}`}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-4"
        >
          <p className="hidden w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground sm:block">
            {displayIndex}
          </p>
          <div className="relative h-14 w-18 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/30 sm:h-18 sm:w-24">
            <Image
              src={location.image || "/placeholder.svg"}
              alt={location.name}
              fill
              className="object-cover"
              style={{
                objectPosition: `${location.imageFocus?.x ?? 50}% ${location.imageFocus?.y ?? 50}%`,
              }}
              sizes="96px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {city?.name}
              {city?.country ? `, ${city.country}` : ""}
            </p>
            <p className="mt-1 text-base font-semibold leading-snug text-foreground sm:text-lg">
              {location.name}
            </p>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
              {location.location.address}
            </p>
          </div>
        </Link>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <Button asChild size="sm" variant="outline" className="h-9 border-border bg-background px-3 text-sm shadow-none">
            <a href={googleMapsHref} target="_blank" rel="noopener noreferrer">
              {t("mapsShort")}
            </a>
          </Button>
          <FictionDetailPlaceLikeButton placeId={location.id} />
        </div>
      </div>
    )
  }

  /** Composite group as a single list item: heading + its member places as sub-rows. */
  const renderGroupRow = (group: PlaceRelationship, rows: LocationRow[], displayIndex: number) => (
    <div className="flex gap-2 sm:gap-4">
      <p className="hidden w-6 shrink-0 pt-0.5 text-center text-sm font-semibold tabular-nums text-muted-foreground sm:block">
        {displayIndex}
      </p>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-base font-semibold leading-snug text-foreground sm:text-lg">
            {group.name}
          </p>
          <span className="text-xs text-muted-foreground">
            {t("compositeGroupHint", { count: rows.length })}
          </span>
        </div>
        <ul className="mt-3 space-y-3">
          {rows.map(({ location, city }) => (
            <li key={location.id}>
              <Link
                href={`/fictions/${pathSlug}/places/${location.slug}`}
                className="group/sub flex min-w-0 items-center gap-2 rounded-lg outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-4"
              >
                <div className="relative h-14 w-18 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/30 sm:h-18 sm:w-24">
                  <Image
                    src={location.image || "/placeholder.svg"}
                    alt={location.name}
                    fill
                    className="object-cover"
                    style={{
                      objectPosition: `${location.imageFocus?.x ?? 50}% ${location.imageFocus?.y ?? 50}%`,
                    }}
                    sizes="96px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground group-hover/sub:text-primary sm:text-base">
                    {location.name}
                  </p>
                  {city ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {city.name}
                      {city.country ? `, ${city.country}` : ""}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )

  const heroSrc =
    fiction.bannerImage?.trim() ||
    fiction.coverImageLarge?.trim() ||
    fiction.coverImage?.trim() ||
    DEFAULT_FICTION_COVER
  const heroFocus = fiction.bannerImage?.trim()
    ? fiction.bannerFocus
    : fiction.coverFocus
  const heroObjectPosition = `${heroFocus?.x ?? 50}% ${heroFocus?.y ?? 50}%`

  const firstCity =
    initialCities[0] ??
    (initialPlaces[0]?.location.cityId
      ? cityById.get(initialPlaces[0].location.cityId)
      : undefined)
  const exploreMapHref = firstCity
    ? `/map?fiction=${encodeURIComponent(fiction.id)}&city=${encodeURIComponent(firstCity.slug)}`
    : `/map?fiction=${encodeURIComponent(fiction.id)}`

  const cityNamesForHeadline = initialCities.map((c) => c.name)
  const headlineCityLabel =
    cityNamesForHeadline.length === 0
      ? ""
      : cityNamesForHeadline.length === 1
        ? cityNamesForHeadline[0]
        : format.list(cityNamesForHeadline, { type: "conjunction" })
  const headlineKey = (() => {
    if (fiction.type === "book") {
      return headlineCityLabel ? "headlineSetInCity" : "headlineSet"
    }
    return headlineCityLabel ? "headlineFilmedInCity" : "headlineFilmed"
  })()
  const headline = t(headlineKey, { title: fiction.title, city: headlineCityLabel })
  const pathSlug = fiction.slug.trim()

  return (
    <main className="px-6 py-8 sm:px-8 lg:px-10">
      <FictionDetailRecentTracker fictionId={fiction.id} fictionSlug={fiction.slug} />
      <div className="mx-auto w-full max-w-[920px]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <PageBreadcrumb
            ariaLabel={tMeta("breadcrumbNavAriaLabel")}
            className="min-w-0 flex-1 pr-2"
            items={[
              { label: tMeta("breadcrumbFictions"), href: "/fictions" },
              { label: fiction.title },
            ]}
          />
          <div className="flex items-center gap-2">
            <FictionDetailLikeButton
              fictionId={fiction.id}
              initialLikeCount={initialLikeCount}
              initialLiked={initialLiked}
            />
            <Button asChild size="sm" variant="cta">
              <Link href={exploreMapHref}>
                <Compass className="h-4 w-4" />
                <span>{t("exploreMap")}</span>
              </Link>
            </Button>
          </div>
        </div>

        <article className="space-y-8">
          <header className="space-y-5 border-b border-border/60 pb-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {fiction.type === "tv-series"
                  ? t("typeTvSeries")
                  : fiction.type === "book"
                    ? t("typeBook")
                    : t("typeMovie")}
              </Badge>
              {fiction.genre && (
                <Badge variant="outline" className="text-xs">
                  {fiction.genre}
                </Badge>
              )}
              {fiction.year && <span>{fiction.year}</span>}
            </div>
            <h1 className="w-full text-balance break-words text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl xl:text-[3.25rem]">
              {headline}
            </h1>
            <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border/60">
              <Image
                src={heroSrc}
                alt={fiction.title}
                fill
                className="object-cover"
                style={{ objectPosition: heroObjectPosition }}
                sizes="(max-width: 1024px) 100vw, 920px"
                priority
              />
            </div>
            {fiction.description && (
              <p className="max-w-[75ch] text-base leading-8 text-muted-foreground">{fiction.description}</p>
            )}
            <FictionInterestTags tags={fictionInterestTags} className="@[1500px]/rails:hidden border-t border-border/60 pt-6" />

            {initialCities.length > 0 && (
              <section className="@[1500px]/rails:hidden space-y-2 border-t border-border/60 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("citiesHeading")}</p>
                <ul className="space-y-2">
                  {initialCities.map((city) => (
                    <li key={city.id} className="text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {city.name}
                        {city.country ? `, ${city.country}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </header>

          <section className="space-y-5">
            <FictionDetailSectionHeading
              title={t("filmingLocationsHeading")}
              count={locationRows.length}
              description={t("placesAcrossCities", {
                placeCount: locationRows.length,
                cityCount: initialCities.length,
              })}
            />

            {locationRows.length === 0 ? (
              <FictionDetailPlacesEmpty />
            ) : (
              <ol className="divide-y divide-border/60 rounded-xl border border-border/40 bg-card/30">
                {listItems.map((item, i) =>
                  item.kind === "place" ? (
                    <li key={item.row.location.id} className="px-3 py-3 sm:px-5 sm:py-5">
                      {renderPlaceRow(item.row, i + 1)}
                    </li>
                  ) : (
                    <li key={item.group.id} className="px-3 py-3 sm:px-5 sm:py-5">
                      {renderGroupRow(item.group, item.rows, i + 1)}
                    </li>
                  ),
                )}
              </ol>
            )}
          </section>

          {recommendationsSlot}

          <FictionDetailCredits credits={credits} fictionTitle={fiction.title} />
        </article>
      </div>
    </main>
  )
}
