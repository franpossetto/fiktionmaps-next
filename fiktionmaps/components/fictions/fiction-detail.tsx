"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { ArrowLeft, ChevronRight, Compass, Heart } from "lucide-react"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/context/auth-context"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FictionCard } from "@/components/fictions/fiction-card"
import { FictionInterestTags, type FictionInterestTagItem } from "@/components/fictions/fiction-interest-tags"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { City } from "@/src/cities/domain/city.entity"
import type { Location } from "@/src/locations/domain/location.entity"
import { getFictionLikeCountsAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import { getMyLikedFictionIdsAction, toggleFictionLikeAction } from "@/src/users/infrastructure/next/user.actions"

export interface FictionDetailProps {
  fiction: FictionWithMedia
  initialLocations: Location[]
  initialCities: City[]
  initialLikeCount: number
  initialLiked: boolean
  /** Shown in main column below `xl` (right rail is `xl`+ only). */
  fictionInterestTags?: FictionInterestTagItem[]
  sameCityRecommendations?: FictionWithMedia[]
  sameCityRecommendationPlaceCounts?: Record<string, number>
}

export function FictionDetail({
  fiction,
  initialLocations,
  initialCities,
  initialLikeCount,
  initialLiked,
  fictionInterestTags = [],
  sameCityRecommendations,
  sameCityRecommendationPlaceCounts,
}: FictionDetailProps) {
  const { user, isAuthReady } = useAuth()
  const t = useTranslations("Fictions")
  const tCommon = useTranslations("Common")
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [likeBusy, setLikeBusy] = useState(false)
  const [coverError, setCoverError] = useState(false)
  const [likedPlaces, setLikedPlaces] = useState<Record<string, boolean>>({})
  const previousUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    setLiked(initialLiked)
    setLikeCount(initialLikeCount)
  }, [fiction.id, initialLiked, initialLikeCount])

  useEffect(() => {
    if (initialLikeCount !== undefined) return
    let cancelled = false
    getFictionLikeCountsAction([fiction.id])
      .then((counts) => {
        if (!cancelled) setLikeCount(counts[fiction.id] ?? 0)
      })
      .catch(() => {
        if (!cancelled) setLikeCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [fiction.id, initialLikeCount])

  useEffect(() => {
    if (!isAuthReady) return

    if (!user) {
      setLiked(false)
      previousUserId.current = null
      return
    }

    const prev = previousUserId.current
    const uid = user.id

    if (prev === undefined) {
      previousUserId.current = uid
      setLiked(initialLiked)
      return
    }

    if (prev === null || prev !== uid) {
      previousUserId.current = uid
      let cancelled = false
      getMyLikedFictionIdsAction()
        .then((ids) => {
          if (!cancelled) setLiked(ids.includes(fiction.id))
        })
        .catch(() => {
          if (!cancelled) setLiked(false)
        })
      return () => {
        cancelled = true
      }
    }
  }, [isAuthReady, user, fiction.id, initialLiked])

  async function handleToggleLike() {
    if (!user || likeBusy) return
    const wasLiked = liked
    const prevCount = likeCount
    setLikeBusy(true)
    setLiked(!wasLiked)
    setLikeCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1)
    try {
      const result = await toggleFictionLikeAction(fiction.id)
      if (!result.success) {
        setLiked(wasLiked)
        setLikeCount(prevCount)
        return
      }
      setLiked(result.liked)
      setLikeCount(result.likeCount)
    } catch {
      setLiked(wasLiked)
      setLikeCount(prevCount)
    } finally {
      setLikeBusy(false)
    }
  }

  function togglePlaceLike(locationId: string) {
    setLikedPlaces((prev) => ({
      ...prev,
      [locationId]: !prev[locationId],
    }))
  }

  const locationRows = useMemo(() => {
    const cityById = new Map(initialCities.map((city) => [city.id, city]))
    return initialLocations.map((location, index) => ({
      index: index + 1,
      location,
      city: cityById.get(location.cityId),
    }))
  }, [initialLocations, initialCities])

  const heroSrc =
    !coverError &&
    (fiction.bannerImage?.trim() || fiction.coverImageLarge?.trim() || fiction.coverImage?.trim())
      ? (fiction.bannerImage?.trim() || fiction.coverImageLarge?.trim() || fiction.coverImage?.trim())!
      : DEFAULT_FICTION_COVER

  const firstCityId = initialCities[0]?.id ?? initialLocations[0]?.cityId
  const exploreMapHref = firstCityId
    ? `/map?fiction=${encodeURIComponent(fiction.id)}&city=${encodeURIComponent(firstCityId)}`
    : `/map?fiction=${encodeURIComponent(fiction.id)}`

  const firstCityName = initialCities[0]?.name ?? ""
  const headlineKey = (() => {
    if (fiction.type === "book") {
      return firstCityName ? "headlineSetInCity" : "headlineSet"
    }
    return firstCityName ? "headlineFilmedInCity" : "headlineFilmed"
  })()
  const headline = t(headlineKey, { title: fiction.title, city: firstCityName })

  const pathSlug = fiction.slug?.trim() || fiction.id

  const backClassName =
    "inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"

  return (
    <main className="px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[900px]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/fictions" className={backClassName}>
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back")}
          </Link>
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleToggleLike}
                disabled={likeBusy}
                aria-label={liked ? t("unlike") : t("like")}
                className="gap-1.5"
              >
                <Heart className={`h-4 w-4 ${liked ? "text-rose-500" : ""}`} fill={liked ? "currentColor" : "none"} />
                {likeCount > 0 && <span className="text-xs tabular-nums">{likeCount}</span>}
              </Button>
            )}
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
            <h1 className="w-full max-w-[min(100%,45rem)] text-balance break-words text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl xl:text-[3.25rem]">
              {headline}
            </h1>
            <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-border/60">
              <Image
                src={heroSrc}
                alt={fiction.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
                onError={() => setCoverError(true)}
              />
            </div>
            {fiction.description && (
              <p className="max-w-[75ch] text-base leading-8 text-muted-foreground">{fiction.description}</p>
            )}
            <FictionInterestTags tags={fictionInterestTags} className="xl:hidden border-t border-border/60 pt-6" />
          </header>

          <section className="space-y-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-7 w-1 rounded-full bg-yellow-500" aria-hidden />
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">{t("filmingLocationsHeading")}</h2>
                <span className="text-base font-medium text-muted-foreground">{locationRows.length}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-1.5 text-base text-muted-foreground">
                {t("placesAcrossCities", {
                  placeCount: locationRows.length,
                  cityCount: initialCities.length,
                })}
              </p>
            </div>

            <ol className="divide-y divide-border/60 rounded-xl border border-border/40 bg-card/30">
              {locationRows.map(({ index, location, city }) => {
                const googleMapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.lat},${location.lng}`)}`
                return (
                  <li key={location.id} className="px-4 py-4 sm:px-5 sm:py-5">
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/fictions/${pathSlug}/places/${location.id}`}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-lg outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <p className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                          {index}
                        </p>
                        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/30 sm:h-18 sm:w-24">
                          <Image
                            src={location.image || "/placeholder.svg"}
                            alt={location.name}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            {city?.name}
                            {city?.country ? `, ${city.country}` : ""}
                          </p>
                          <p className="mt-1 text-base font-semibold leading-snug text-foreground sm:text-lg">{location.name}</p>
                          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{location.address}</p>
                        </div>
                      </Link>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button asChild size="sm" variant="outline" className="h-9 border-border bg-background px-3 text-sm shadow-none">
                          <a href={googleMapsHref} target="_blank" rel="noopener noreferrer">
                            {t("mapsShort")}
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-9 w-9 p-0"
                          aria-label={likedPlaces[location.id] ? t("unlikePlace") : t("likePlace")}
                          onClick={() => togglePlaceLike(location.id)}
                        >
                          <Heart
                            className={`h-4 w-4 ${likedPlaces[location.id] ? "text-rose-500" : ""}`}
                            fill={likedPlaces[location.id] ? "currentColor" : "none"}
                          />
                        </Button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>

          {sameCityRecommendations && sameCityRecommendations.length > 0 && (
            <section className="space-y-5 border-t border-border/60 pt-8">
              <div className="flex items-center gap-3">
                <span className="h-7 w-1 rounded-full bg-yellow-500" aria-hidden />
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">{t("sameCityRecommendationsTitle")}</h2>
                <span className="text-base font-medium text-muted-foreground">{sameCityRecommendations.length}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-base text-muted-foreground">{t("sameCityRecommendationsDescription")}</p>
              <div className="grid grid-cols-[repeat(2,minmax(0,172px))] gap-3 sm:grid-cols-[repeat(3,minmax(0,172px))]">
                {sameCityRecommendations.map((rec) => (
                  <FictionCard
                    key={rec.id}
                    fiction={rec}
                    locationCount={sameCityRecommendationPlaceCounts?.[rec.id] ?? 0}
                    href={`/fictions/${rec.slug ?? rec.id}`}
                  />
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </main>
  )
}
