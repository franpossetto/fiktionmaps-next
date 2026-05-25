import { unstable_cache } from "next/cache"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import { createFictionsSupabaseAdapter } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { createFictionInterestsSupabaseAdapter } from "@/src/fiction-interests/infrastructure/supabase/fiction-interests.repository.impl"
import { createFictionLikesSupabaseAdapter } from "@/src/fiction-likes/infrastructure/supabase/fiction-likes.repository.impl"
import { createUserInterestsSupabaseAdapter } from "@/src/user-interests/infrastructure/supabase/user-interests.repository.impl"
import { createCitiesSupabaseAdapter } from "@/src/cities/infrastructure/supabase/city.repository.impl"
import { createPlacesSupabaseAdapter } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { getAllFictionsUseCase } from "@/src/fictions/application/get-all-fictions.usecase"
import { getActiveFictionsUseCase } from "@/src/fictions/application/get-active-fictions.usecase"
import { getFictionByIdUseCase } from "@/src/fictions/application/get-fiction-by-id.usecase"
import { getFictionWithCatalogExternalIdsForStaffUseCase } from "@/src/fictions/application/get-fiction-with-catalog-external-ids-for-staff.usecase"
import { createFictionExternalIdsSupabaseAdapter } from "@/src/fiction-external-ids/infrastructure/supabase/fiction-external-ids.repository.impl"
import { getFictionBySlugUseCase } from "@/src/fictions/application/get-fiction-by-slug.usecase"
import { getFictionsByIdsUseCase } from "@/src/fictions/application/get-fictions-by-ids.usecase"
import { getFictionCitiesUseCase } from "@/src/fictions/application/get-fiction-cities.usecase"
import {
  getFictionDetailRecommendationsUseCase,
  type GetFictionDetailRecommendationsInput,
} from "@/src/fictions/application/get-fiction-detail-recommendations.usecase"
import { getFictionLikeCountsUseCase } from "@/src/fiction-likes/application/get-fiction-like-counts.usecase"
import { getFictionInterestsUseCase } from "@/src/fiction-interests/application/get-fiction-interests.usecase"
import { isUuidString } from "@/lib/validation/primitives"
import type { FictionWithMedia, FictionWithMediaAndCatalogIds } from "@/src/fictions/domain/fiction.entity"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"
import { getIsUserStaff } from "@/src/users/infrastructure/next/user.queries"

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

/** Respects staff RLS (e.g. pending fictions). Caller should only use on staff-only pages. */
export async function getFictionByIdForStaffSession(id: string): Promise<FictionWithMediaAndCatalogIds | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  const staff = await getIsUserStaff(user.id)
  if (!staff) return null
  const fictionsRepo = createFictionsSupabaseAdapter(async () => supabase)
  const externalIdsRepo = createFictionExternalIdsSupabaseAdapter(async () => supabase)
  return getFictionWithCatalogExternalIdsForStaffUseCase(id, fictionsRepo, externalIdsRepo)
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

/** Interest ids linked to this fiction (`fiction_interests`). */
export function getFictionInterestsCached(fictionId: string) {
  return unstable_cache(
    () => getFictionInterestsUseCase(fictionId, fictionInterestsRepo),
    CacheKeys.fiction(`interests:${fictionId}`),
    { ...CacheConfig.long, tags: ["fictions", `fiction-${fictionId}`] }
  )()
}

/**
 * Fiction detail movie recommendations: same city → shared interests → random.
 * Uncached (random branch). Pass `places` when already loaded to avoid an extra fetch.
 */
export function getFictionDetailRecommendations(input: GetFictionDetailRecommendationsInput) {
  return getFictionDetailRecommendationsUseCase(input, {
    placesRepo,
    locationsRepo: placesRepo,
    fictionInterestsRepo,
    fictionsRepo,
  })
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
