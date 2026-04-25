import { unstable_cache } from "next/cache"
import { createAnonymousClient } from "@/lib/supabase/server"
import { createFictionsSupabaseAdapter } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { createFictionInterestsSupabaseAdapter } from "@/src/fiction-interests/infrastructure/supabase/fiction-interests.repository.impl"
import { createFictionLikesSupabaseAdapter } from "@/src/fiction-likes/infrastructure/supabase/fiction-likes.repository.impl"
import { createUserInterestsSupabaseAdapter } from "@/src/user-interests/infrastructure/supabase/user-interests.repository.impl"
import { createCitiesSupabaseAdapter } from "@/src/cities/infrastructure/supabase/city.repository.impl"
import { createPlacesSupabaseAdapter } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { getAllFictionsUseCase } from "@/src/fictions/application/get-all-fictions.usecase"
import { getActiveFictionsUseCase } from "@/src/fictions/application/get-active-fictions.usecase"
import { getFictionByIdUseCase } from "@/src/fictions/application/get-fiction-by-id.usecase"
import { getFictionBySlugUseCase } from "@/src/fictions/application/get-fiction-by-slug.usecase"
import { getFictionsByIdsUseCase } from "@/src/fictions/application/get-fictions-by-ids.usecase"
import { getFictionCitiesUseCase } from "@/src/fictions/application/get-fiction-cities.usecase"
import { getSameCityMovieRecommendationsUseCase } from "@/src/fictions/application/get-same-city-movie-recommendations.usecase"
import { getFictionLikeCountsUseCase } from "@/src/fiction-likes/application/get-fiction-like-counts.usecase"
import { isUuidString } from "@/lib/validation/primitives"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const anon = () => Promise.resolve(createAnonymousClient())
const fictionsRepo = createFictionsSupabaseAdapter(anon)
const fictionInterestsRepo = createFictionInterestsSupabaseAdapter(anon)
const fictionLikesRepo = createFictionLikesSupabaseAdapter(anon)
const citiesRepo = createCitiesSupabaseAdapter(anon)
const placesRepo = createPlacesSupabaseAdapter(anon)

export function getAllFictionsCached() {
  return unstable_cache(
    () => getAllFictionsUseCase(fictionsRepo),
    CacheKeys.fiction("all"),
    { ...CacheConfig.long, tags: ["fictions"] }
  )()
}

export async function getActiveFictionsCached(): Promise<FictionWithMedia[]> {
  return unstable_cache(
    () => getActiveFictionsUseCase(fictionsRepo),
    CacheKeys.fiction("active"),
    { ...CacheConfig.long, tags: ["fictions"] }
  )()
}

export function getFictionByIdCached(id: string) {
  return unstable_cache(
    () => getFictionByIdUseCase(id, fictionsRepo),
    CacheKeys.fiction(id),
    { ...CacheConfig.long, tags: ["fictions", `fiction-${id}`] }
  )()
}

export function getFictionBySlugCached(slug: string) {
  return unstable_cache(
    () => getFictionBySlugUseCase(slug, fictionsRepo),
    CacheKeys.fiction(`slug:${slug}`),
    { ...CacheConfig.long, tags: ["fictions", `fiction-slug-${slug}`] }
  )()
}

export function getFictionsByIdsCached(ids: string[]) {
  const key = ids.slice().sort().join(",")
  return unstable_cache(
    () => getFictionsByIdsUseCase(ids, fictionsRepo),
    CacheKeys.fiction(`ids:${key}`),
    { ...CacheConfig.long, tags: ["fictions"] }
  )()
}

export function getFictionCitiesCached(fictionId: string) {
  return unstable_cache(
    () => getFictionCitiesUseCase(fictionId, { locationsRepo: placesRepo, citiesRepo }),
    CacheKeys.fiction(`cities:${fictionId}`),
    { ...CacheConfig.long, tags: ["fictions", "cities", `fiction-${fictionId}`] }
  )()
}

/** Active movies that share at least one city with this fiction (by place locations). */
export function getSameCityMovieRecommendationsCached(fictionId: string) {
  return unstable_cache(
    () =>
      getSameCityMovieRecommendationsUseCase(fictionId, {
        locationsRepo: placesRepo,
        placesRepo,
        fictionsRepo,
      }),
    CacheKeys.fiction(`same-city-movies:${fictionId}`),
    { ...CacheConfig.long, tags: ["fictions", "cities", "places", `fiction-${fictionId}`] }
  )()
}

/** Like counts per fiction id (public read). Not cached — counts change when users like/unlike. */
export async function getFictionLikeCountsByIds(fictionIds: string[]): Promise<Record<string, number>> {
  const validIds = fictionIds.filter((id) => isUuidString(id))
  if (validIds.length === 0) return {}
  return getFictionLikeCountsUseCase(validIds, fictionLikesRepo)
}

/** Builds the deps object for the recommendation use case (composition root). */
export function loadRecommendedFictionsDeps() {
  return {
    userInterestsRepo: createUserInterestsSupabaseAdapter(anon),
    fictionInterestsRepo,
    fictionsRepo,
  }
}
