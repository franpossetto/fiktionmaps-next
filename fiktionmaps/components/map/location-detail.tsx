"use client"

import { X, MapPin, Quote, Lightbulb, ArrowRight } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { Place } from "@/src/places/domain/place.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { ContributorProfileWithDate } from "@/src/contributions/domain/contribution.entity"
import { PlaceContributorsByline } from "@/components/fictions/place-contributors-byline"
import { PlaceShootEnvironmentBadge } from "@/components/places/place-shoot-environment-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DEFAULT_FICTION_ACCENT, DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { publicFictionPlacePath } from "@/lib/fictions/public-fiction-paths"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { SceneClipPanelCard } from "./scene-clip-panel-card"
import { getActiveFictionsAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import { loadMapLocationPanel } from "@/lib/map/map-location-panel-cache"

interface LocationDetailProps {
  place: Place
  fiction?: FictionWithMedia | null
  relatedPlaces?: Place[]
  relatedFictions?: FictionWithMedia[]
  onClose: () => void
  /** Reports panel width so the map can center the pin in the remaining viewport (md+). */
  onPanelWidthChange?: (width: number) => void
  onSelectRelatedPlace?: (place: Place) => void
  onView3D?: () => void
}

export function LocationDetail({
  place,
  fiction: fictionProp,
  relatedPlaces = [],
  relatedFictions = [],
  onClose,
  onPanelWidthChange,
  onSelectRelatedPlace,
  onView3D: _onView3D,
}: LocationDetailProps) {
  const t = useTranslations("Map")
  const tFictions = useTranslations("Fictions")
  const [fiction, setFiction] = useState<FictionWithMedia | undefined>(
    fictionProp ?? undefined
  )
  const [placeScenes, setPlaceScenes] = useState<Scene[]>([])
  const [placeDetail, setPlaceDetail] = useState<Place | null>(null)
  const [placeContributors, setPlaceContributors] = useState<ContributorProfileWithDate[]>([])
  const [panelLoading, setPanelLoading] = useState(true)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    const el = panelRef.current
    if (!el || !onPanelWidthChange) return

    const report = () => {
      const fullBleed = window.matchMedia("(max-width: 767px)").matches
      onPanelWidthChange(fullBleed ? 0 : el.offsetWidth)
    }

    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    window.addEventListener("resize", report)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", report)
      onPanelWidthChange(0)
    }
  }, [onPanelWidthChange])

  useEffect(() => {
    let cancelled = false
    if (fictionProp !== undefined) {
      setFiction(fictionProp ?? undefined)
    } else {
      getActiveFictionsAction()
        .then((rows) => {
          if (cancelled) return
          const hit = rows.find((f) => f.id === place.fictionId)
          setFiction(hit ?? undefined)
        })
        .catch(() => {
          if (!cancelled) setFiction(undefined)
        })
    }
    return () => {
      cancelled = true
    }
  }, [place.fictionId, fictionProp])

  useEffect(() => {
    let cancelled = false
    setPanelLoading(true)
    // Keep pin thumb visible; don't wipe contributors to empty flash if prefetch already settled.
    loadMapLocationPanel(place.id)
      .then((panel) => {
        if (cancelled) return
        setPlaceDetail(panel.place)
        setPlaceScenes(panel.scenes)
        setPlaceContributors(panel.contributors)
        setPanelLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setPlaceDetail(null)
        setPlaceScenes([])
        setPlaceContributors([])
        setPanelLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [place.id])

  const displayName = place.name
  /** Pin payload is xs — only use as LQIP; hero waits for lg from panel. */
  const pinThumb = place.image?.trim() || null
  const heroLg = placeDetail?.image?.trim() || null
  const heroSrc = heroLg || pinThumb || DEFAULT_FICTION_COVER
  const heroIsLqip = !heroLg && Boolean(pinThumb)
  const placeDescription = placeDetail?.description?.trim() || place.description?.trim()
  const shootEnvironment = placeDetail?.shootEnvironment ?? place.shootEnvironment
  const fictionMeta = [fiction?.year, fiction?.genre, fiction?.author].filter(Boolean).join(" · ")
  const fictionCoverSrc =
    fiction?.coverImage?.trim() || fiction?.coverImageLarge?.trim() || "/placeholder.svg"
  const hasSceneNarrative = Boolean(place.sceneDescription?.trim() || place.sceneQuote?.trim())
  const fictionSlug = fiction?.slug
  const placePageHref =
    fictionSlug && place.slug ? publicFictionPlacePath(fictionSlug, place.slug) : null

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [place.id])

  const panel = (
    <aside
      ref={panelRef}
      className="pointer-events-auto fixed inset-y-0 right-0 z-[4900] flex w-full flex-col border-l border-border/70 bg-background shadow-xl md:w-[min(100%,480px)] lg:w-[min(100%,540px)] xl:w-[min(100%,580px)]"
      role="dialog"
      aria-modal="true"
      aria-label={t("locationDetailDialogTitle", {
        name: displayName,
      })}
    >
        <ScrollArea className="min-h-0 flex-1">
          <article className="space-y-7 px-5 py-5 sm:px-6 sm:py-6">
            <header className="space-y-5 border-b border-border/60 pb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {fiction?.type && (
                    <Badge variant="secondary" className="text-xs">
                      {fiction.type === "tv-series"
                        ? tFictions("typeTvSeries")
                        : fiction.type === "book"
                          ? tFictions("typeBook")
                          : tFictions("typeMovie")}
                    </Badge>
                  )}
                  {fiction?.genre && (
                    <Badge variant="outline" className="text-xs">
                      {fiction.genre}
                    </Badge>
                  )}
                  {fiction?.year && <span>{fiction.year}</span>}
                  {shootEnvironment ? <PlaceShootEnvironmentBadge value={shootEnvironment} /> : null}
                </div>
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-foreground transition-colors hover:bg-muted"
                  aria-label={t("closeLocationDetail")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold leading-[1.15] tracking-tight text-foreground text-balance sm:text-2xl">
                  {fiction
                    ? tFictions("placeDetailCatchyHeading", {
                        placeName: displayName,
                        fictionName: fiction.title,
                      })
                    : displayName}
                </h2>
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs leading-relaxed">{place.location.address}</span>
                </div>
              </div>

              <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                {pinThumb && heroLg && pinThumb !== heroLg ? (
                  <Image
                    src={pinThumb}
                    alt=""
                    fill
                    aria-hidden
                    className="object-cover scale-105 blur-md"
                    sizes="(max-width: 768px) 100vw, 580px"
                  />
                ) : null}
                <Image
                  key={heroLg || place.id}
                  src={heroSrc}
                  alt={displayName}
                  fill
                  className={cn(
                    "object-cover transition-[filter,transform,opacity] duration-300",
                    heroIsLqip ? "scale-105 blur-md" : "blur-0 scale-100",
                  )}
                  sizes="(max-width: 768px) 100vw, 580px"
                  priority
                />
              </div>

              {panelLoading && placeContributors.length === 0 ? (
                <div className="flex items-center gap-2.5" aria-hidden>
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                </div>
              ) : (
                <PlaceContributorsByline contributors={placeContributors} className="max-w-full" />
              )}

              {placeDescription ? (
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-8">
                  {placeDescription}
                </p>
              ) : null}

              {fiction && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-card/30 p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md border border-border/60">
                      <Image
                        src={fictionCoverSrc}
                        alt={fiction.title}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                        {fiction.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{fictionMeta || "—"}</p>
                    </div>
                  </div>
                  {fiction.description?.trim() ? (
                    <p className="text-sm leading-relaxed text-secondary-foreground">
                      {fiction.description}
                    </p>
                  ) : null}
                </div>
              )}
            </header>

            {placeScenes.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-1 rounded-full bg-yellow-500" aria-hidden />
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {t("sceneClips")}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {t("sceneClipCount", { count: placeScenes.length })}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {placeScenes.slice(0, 5).map((sc) => (
                    <SceneClipPanelCard
                      key={sc.id}
                      scene={sc}
                      fiction={fiction ?? null}
                      noVideoLabel={t("noSceneVideo")}
                      playVideoLabel={t("playSceneVideo")}
                      filmTimelineCaption={t("filmTimelineCaption")}
                    />
                  ))}
                </div>
                {placeScenes.length > 5 && (
                  <p className="text-center text-xs text-muted-foreground">
                    {t("moreClipsOnPlacePage", { count: placeScenes.length - 5 })}
                  </p>
                )}
              </section>
            )}

            {relatedPlaces.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-1 rounded-full bg-yellow-500" aria-hidden />
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {t("nextPlacesHeading")}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    ({Math.min(3, relatedPlaces.length)})
                  </span>
                </div>
                <ul className="space-y-2">
                  {relatedPlaces.slice(0, 3).map((related) => (
                    <li key={related.id}>
                      <button
                        type="button"
                        onClick={() => onSelectRelatedPlace?.(related)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/30 p-2.5 text-left transition-colors hover:bg-card/60"
                      >
                        <div className="relative h-14 w-18 shrink-0 overflow-hidden rounded-md border border-border/60">
                          <Image
                            src={related.image || "/placeholder.svg"}
                            alt={related.name}
                            fill
                            className="object-cover"
                            sizes="72px"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">
                            {related.name}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{related.location.address}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {relatedFictions.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-1 rounded-full bg-yellow-500" aria-hidden />
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {t("relatedFictionsHeading")}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {relatedFictions.slice(0, 4).map((relatedFiction) => (
                    <li key={relatedFiction.id}>
                      <Link
                        href={`/fictions/${relatedFiction.slug}`}
                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/30 p-2.5 transition-colors hover:bg-card/60"
                      >
                        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md border border-border/60">
                          <Image
                            src={
                              relatedFiction.coverImage?.trim() ||
                              relatedFiction.coverImageLarge?.trim() ||
                              "/placeholder.svg"
                            }
                            alt={relatedFiction.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-semibold text-foreground">
                            {relatedFiction.title}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {[relatedFiction.year, relatedFiction.genre].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {hasSceneNarrative && (
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-1 rounded-full bg-yellow-500" aria-hidden />
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {t("locationScene")}
                  </h3>
                </div>
                <div className="space-y-3 rounded-xl border border-border/60 bg-card/30 p-4">
                  {place.sceneDescription?.trim() ? (
                    <p className="text-sm leading-relaxed text-secondary-foreground">
                      {place.sceneDescription}
                    </p>
                  ) : null}
                  {place.sceneQuote && (
                    <div className="flex gap-2 rounded-lg border border-border/60 bg-background/70 p-3">
                      <Quote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-sm italic text-foreground">
                        {place.sceneQuote}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {place.visitTip && (
              <section className="flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex flex-col gap-1">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {t("visitorTip")}
                  </h3>
                  <p className="text-sm leading-relaxed text-secondary-foreground">
                    {place.visitTip}
                  </p>
                </div>
              </section>
            )}

          </article>
        </ScrollArea>

        {placePageHref ? (
          <footer className="shrink-0 border-t border-border/60 px-5 py-4 sm:px-6">
            <Button asChild variant="secondary" size="sm" className="h-9 w-full">
              <Link href={placePageHref} className="justify-between">
                <span>{t("seeFullPlaceArticle")}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </Link>
            </Button>
          </footer>
        ) : null}
    </aside>
  )

  if (!portalReady) return null
  return createPortal(panel, document.body)
}
