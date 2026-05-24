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
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import { FictionContributePreviewSidebar } from "@/components/contribute/fiction/fiction-contribute-preview-sidebar"

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
                        <li key={rowKey} className="px-3 py-3 sm:px-5 sm:py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                              <p className="hidden w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground sm:block">
                                {index}
                              </p>
                              <div className="relative flex h-14 w-18 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40 sm:h-18 sm:w-24">
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
                            <div className="hidden shrink-0 items-center gap-2 sm:flex">
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
