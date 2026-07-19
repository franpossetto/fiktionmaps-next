import { ChevronRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { FictionCard } from "@/components/fictions/fiction-card"
import {
  getFictionDetailRecommendations,
} from "@/src/fictions/infrastructure/next/fiction.queries"
import { getPlaceCountsByFictionIdsCached } from "@/src/places/infrastructure/next/place.queries"
import type { Place } from "@/src/places/domain/place.entity"
import type { FictionDetailRecommendationReason } from "@/src/fictions/application/get-fiction-detail-recommendations.usecase"

function reasonCopy(
  t: Awaited<ReturnType<typeof getTranslations>>,
  reason: FictionDetailRecommendationReason,
): string {
  switch (reason) {
    case "same_city":
      return t("fictionRecommendationsSameCity")
    case "shared_interests_no_places":
      return t("fictionRecommendationsSharedInterestsNoPlaces")
    case "shared_interests_no_city_peers":
      return t("fictionRecommendationsSharedInterestsNoCityPeers")
    case "random_no_matches":
      return t("fictionRecommendationsRandomNoMatches")
    case "random_no_places_no_interests":
      return t("fictionRecommendationsRandomNoPlacesNoInterests")
    default:
      return ""
  }
}

/** Async RSC: loads recs off the critical path when wrapped in Suspense. */
export async function FictionDetailRecommendations({
  fictionId,
  interestIds,
  places,
}: {
  fictionId: string
  interestIds: string[]
  places: Place[]
}) {
  const t = await getTranslations("Fictions")
  const { fictions, reason } = await getFictionDetailRecommendations({
    fictionId,
    interestIds,
    places,
  })
  if (fictions.length === 0) return null

  const placeCounts = await getPlaceCountsByFictionIdsCached(fictions.map((f) => f.id))
  const description = reasonCopy(t, reason)

  return (
    <section className="space-y-5 border-t border-border/60 pt-8">
      <div className="flex items-center gap-3">
        <span className="h-7 w-1 rounded-full bg-yellow-500" aria-hidden />
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {t("fictionRecommendationsTitle")}
        </h2>
        <span className="text-base font-medium text-muted-foreground">{fictions.length}</span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
      {description ? <p className="text-base text-muted-foreground">{description}</p> : null}
      <div className="grid grid-cols-[repeat(2,minmax(0,172px))] gap-3 sm:grid-cols-[repeat(3,minmax(0,172px))]">
        {fictions.map((rec) => (
          <FictionCard
            key={rec.id}
            fiction={rec}
            locationCount={placeCounts[rec.id] ?? 0}
            href={`/fictions/${rec.slug}`}
          />
        ))}
      </div>
    </section>
  )
}

export function FictionDetailRecommendationsFallback() {
  return (
    <section className="space-y-5 border-t border-border/60 pt-8" aria-hidden>
      <div className="h-8 w-64 animate-pulse rounded bg-muted/50" />
      <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted/40" />
      <div className="grid grid-cols-[repeat(2,minmax(0,172px))] gap-3 sm:grid-cols-[repeat(3,minmax(0,172px))]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    </section>
  )
}
