"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { ChevronRight, Heart, ImageIcon, MapPin } from "lucide-react"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { cn } from "@/lib/utils"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import { Badge } from "@/components/ui/badge"
import { FictionInterestTags, type FictionInterestTagItem } from "@/components/fictions/fiction-interest-tags"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import {
  FICTION_SLUG_DETAIL_SIDEBAR_RIGHT_GAP_PX,
  FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX,
} from "@/components/fictions/fiction-slug-detail-shell"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"

const DEMO_ROW_KEYS = [
  "publicPreviewDemoRow1",
  "publicPreviewDemoRow2",
  "publicPreviewDemoRow3",
  "publicPreviewDemoRow4",
] as const

const PREVIEW_DEMO_PLACE_COUNT = DEMO_ROW_KEYS.length

const DEMO_LINE_SEP = " — "

function splitDemoPlaceLine(line: string): { city: string; place: string; address: string } {
  const parts = line.split(DEMO_LINE_SEP).map((s) => s.trim())
  return {
    city: parts[0] ?? "",
    place: parts[1] ?? "",
    address: parts[2] ?? "",
  }
}

export interface FictionContributePublicPreviewProps {
  title: string
  type: Fiction["type"]
  year: number
  genre: string
  description: string
  /** Banner URL (blob or remote); falls back to cover. */
  bannerSrc: string | null
  /** Cover URL (blob or remote). */
  coverSrc: string | null
  /** Shown in the sidebar third slot (same line as year · genre), e.g. director name. */
  creditLine?: string | null
  interestTags: FictionInterestTagItem[]
  /** Optional short blurb under the title in the left rail (e.g. excerpt). */
  summaryText?: string | null
  className?: string
}

function FictionContributePreviewSidebar(props: {
  title: string
  type: Fiction["type"]
  year: number
  genre: string
  creditLine?: string | null
  coverSrc: string | null
  summaryText?: string | null
}) {
  const t = useTranslations("Fictions")
  const { title, year, genre, creditLine, coverSrc, summaryText, type } = props
  const typeLabel =
    type === "tv-series" ? t("typeTvSeries") : type === "book" ? t("typeBook") : t("typeMovie")

  const cover = coverSrc?.trim() || DEFAULT_FICTION_COVER

  return (
    <div
      className={cn("hidden py-10 lg:flex", "justify-end")}
      style={{ paddingRight: `${FICTION_SLUG_DETAIL_SIDEBAR_RIGHT_GAP_PX}px` }}
    >
      <div className="space-y-3.5" style={{ width: `${FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX}px` }}>
        <div className="relative ml-auto aspect-[2/3] w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          <Image
            src={cover}
            alt={title}
            fill
            className="object-cover"
            sizes={`${FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX}px`}
            unoptimized={cover.startsWith("blob:")}
          />
        </div>

        <div className="space-y-2">
          <h2 className="max-w-full break-words font-serif text-[1.35rem] font-semibold leading-tight text-foreground xl:text-[1.5rem]">
            {title || "—"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {year || "—"}
            {genre ? ` · ${genre}` : ""}
            {creditLine?.trim() ? ` · ${creditLine.trim()}` : ""}
          </p>
        </div>

        {summaryText?.trim() ? (
          <p className="line-clamp-4 text-[12px] leading-5 text-muted-foreground">{summaryText.trim()}</p>
        ) : null}

        <div className="border-t border-border/60 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">{t("sidebarDetails")}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">{t("sidebarType")}</dt>
            <dd className="font-medium text-foreground">{typeLabel}</dd>
            <dt className="text-muted-foreground">{t("sidebarYear")}</dt>
            <dd className="font-medium text-foreground">{year || "—"}</dd>
            <dt className="text-muted-foreground">{t("sidebarGenre")}</dt>
            <dd className="font-medium text-foreground">{genre || "—"}</dd>
          </dl>
        </div>
      </div>
    </div>
  )
}

export function FictionContributePublicPreview({
  title,
  type,
  year,
  genre,
  description,
  bannerSrc,
  coverSrc,
  creditLine,
  interestTags,
  summaryText,
  className,
}: FictionContributePublicPreviewProps) {
  const t = useTranslations("Fictions")
  const tMeta = useTranslations("Metadata")
  const tPreview = useTranslations("Contribute.fiction")
  const [heroError, setHeroError] = useState(false)

  useEffect(() => {
    setHeroError(false)
  }, [bannerSrc, coverSrc])

  const heroSrc = useMemo(() => {
    if (heroError) return DEFAULT_FICTION_COVER
    const b = bannerSrc?.trim()
    const c = coverSrc?.trim()
    if (b) return b
    if (c) return c
    return DEFAULT_FICTION_COVER
  }, [bannerSrc, coverSrc, heroError])

  const headlineCityLabel = ""
  const headlineKey = type === "book" ? "headlineSet" : "headlineFilmed"
  const headline = t(headlineKey, { title: title || "—", city: headlineCityLabel })

  const rightAside =
    interestTags.length > 0 ? (
      <div className="mx-auto w-full max-w-[260px] space-y-4">
        <FictionInterestTags tags={interestTags} />
      </div>
    ) : null

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div className="border-b border-border/50 bg-muted/20 px-3 py-2 text-center text-xs font-medium text-muted-foreground sm:text-sm">
        {tPreview("publicPreviewRibbon")}
      </div>
      <div className="h-[min(72vh,52rem)] min-h-[22rem] w-full max-w-full">
        <AppDetailRailsShell
          leftAside={
            <FictionContributePreviewSidebar
              title={title}
              type={type}
              year={year}
              genre={genre}
              creditLine={creditLine}
              coverSrc={coverSrc}
              summaryText={summaryText}
            />
          }
          rightAside={rightAside}
        >
          <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div className="mx-auto w-full max-w-[920px]">
              <div className="mb-6 flex min-h-[2.25rem] flex-wrap items-center justify-between gap-3">
                <PageBreadcrumb
                  ariaLabel={tMeta("breadcrumbNavAriaLabel")}
                  className="min-w-0 flex-1 pr-2"
                  items={[
                    { label: tMeta("breadcrumbFictions"), href: "/fictions" },
                    { label: title || "—" },
                  ]}
                />
              </div>

              <article className="space-y-8">
                <header className="space-y-5 border-b border-border/60 pb-8">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {type === "tv-series"
                        ? t("typeTvSeries")
                        : type === "book"
                          ? t("typeBook")
                          : t("typeMovie")}
                    </Badge>
                    {genre ? (
                      <Badge variant="outline" className="text-xs">
                        {genre}
                      </Badge>
                    ) : null}
                    {year ? <span>{year}</span> : null}
                  </div>
                  <h1 className="w-full text-balance break-words text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl xl:text-[3.25rem]">
                    {headline}
                  </h1>
                  <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border/60">
                    <Image
                      src={heroSrc}
                      alt={title || ""}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      onError={() => setHeroError(true)}
                      unoptimized={heroSrc.startsWith("blob:")}
                    />
                  </div>
                  {description.trim() ? (
                    <p className="max-w-[75ch] text-base leading-8 text-muted-foreground">{description}</p>
                  ) : null}
                  <FictionInterestTags
                    tags={interestTags}
                    className="@[1500px]/rails:hidden border-t border-border/60 pt-6"
                  />
                </header>

                <section className="space-y-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="h-7 w-1 rounded-full bg-yellow-500" aria-hidden />
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {t("filmingLocationsHeading")}
                      </h2>
                      <span className="text-base font-medium text-muted-foreground">{PREVIEW_DEMO_PLACE_COUNT}</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="mt-1.5 text-base text-muted-foreground">
                      {tPreview("publicPreviewPlacesDemoLead", { count: PREVIEW_DEMO_PLACE_COUNT })}
                    </p>
                  </div>

                  <ol
                    className="divide-y divide-border/60 rounded-xl border border-border/40 bg-card/30"
                    aria-hidden
                  >
                    {DEMO_ROW_KEYS.map((rowKey, idx) => {
                      const index = idx + 1
                      const { city, place, address } = splitDemoPlaceLine(tPreview(rowKey))
                      return (
                        <li key={rowKey} className="px-4 py-4 sm:px-5 sm:py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex min-w-0 flex-1 items-center gap-4">
                              <p className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                                {index}
                              </p>
                              <div className="relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40 sm:h-18 sm:w-24">
                                <ImageIcon className="h-7 w-7 text-muted-foreground/45" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  <span className="truncate">{city}</span>
                                </p>
                                <p className="mt-1 text-base font-semibold leading-snug text-foreground sm:text-lg">
                                  {place}
                                </p>
                                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{address}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="inline-flex h-9 items-center rounded-md border border-dashed border-border/80 bg-muted/20 px-3 text-xs text-muted-foreground">
                                {t("mapsShort")}
                              </span>
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-border/80 bg-muted/20 text-muted-foreground/60">
                                <Heart className="h-4 w-4" aria-hidden />
                              </span>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </section>
              </article>
            </div>
          </main>
        </AppDetailRailsShell>
      </div>
    </div>
  )
}
