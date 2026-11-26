import { getTranslations } from "next-intl/server"
import { TopContributorsSection } from "@/components/contributions/top-contributors-section"
import { FictionDetailCredits } from "@/components/fictions/fiction-detail-credits"
import { FictionStoryView } from "@/components/fictions/story/fiction-story-view"
import { composeFictionStoryCards } from "@/components/fictions/story/compose-fiction-story-cards"
import { getFictionContributorsCached } from "@/src/contributions/infrastructure/next/contribution.queries"
import { getFictionPersonsCached } from "@/src/persons/infrastructure/next/person.queries"
import { getScenesForFictionCached } from "@/src/scenes/infrastructure/next/scene.queries"
import { getPlaceLocationsByIdsXlCached } from "@/src/places/infrastructure/next/place.queries"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"

/** Async RSC: contributors off the fiction critical path (right rail). */
export async function FictionDetailContributors({
  fictionId,
  fictionTitle,
  showBorderTop = false,
}: {
  fictionId: string
  fictionTitle: string
  showBorderTop?: boolean
}) {
  const t = await getTranslations("Fictions")
  const contributors = await getFictionContributorsCached(fictionId)
  if (contributors.length === 0) return null
  return (
    <TopContributorsSection
      contributors={contributors}
      title={t("contributorsHeading")}
      nameFallback={t("contributorNameFallback")}
      showBorderTop={showBorderTop}
      modalContext={{ type: "fiction", fictionId, fictionTitle }}
    />
  )
}

export function FictionDetailContributorsFallback() {
  return <div className="h-28 w-full animate-pulse rounded-lg bg-muted/40" aria-hidden />
}

/** Async RSC: credits off the fiction critical path. */
export async function FictionDetailCreditsDeferred({
  fictionId,
  fictionTitle,
}: {
  fictionId: string
  fictionTitle: string
}) {
  const credits = await getFictionPersonsCached(fictionId)
  if (credits.length === 0) return null
  return <FictionDetailCredits credits={credits} fictionTitle={fictionTitle} />
}

export function FictionDetailCreditsFallback() {
  return (
    <section className="space-y-5 border-t border-border/60 pt-8" aria-hidden>
      <div className="h-8 w-48 animate-pulse rounded bg-muted/50" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    </section>
  )
}

/**
 * Async RSC: story button + deck. Scenes + xl avatars stay off the critical path;
 * list thumbs keep the lighter approved-list payload.
 */
export async function FictionDetailStoryDeferred({
  fiction,
  places,
  cities,
}: {
  fiction: FictionWithMedia
  places: Place[]
  cities: City[]
}) {
  const [scenes, xlPlaces] = await Promise.all([
    getScenesForFictionCached(fiction.id),
    getPlaceLocationsByIdsXlCached(places.map((p) => p.id)),
  ])

  const xlById = new Map(xlPlaces.map((p) => [p.id, p]))
  const phonePlaces = places.map((place) => {
    const hi = xlById.get(place.id)
    if (!hi) return place
    return { ...place, image: hi.image, imageFocus: hi.imageFocus }
  })

  const storyCards = await composeFictionStoryCards({
    fiction,
    places: phonePlaces,
    cities,
    scenes,
  })
  if (storyCards.length === 0) return null
  return <FictionStoryView cards={storyCards} />
}

export function FictionDetailStoryFallback() {
  return <div className="h-9 w-24 animate-pulse rounded-md bg-muted/40" aria-hidden />
}
