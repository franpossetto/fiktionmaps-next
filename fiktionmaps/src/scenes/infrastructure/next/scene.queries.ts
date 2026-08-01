import { unstable_cache } from "next/cache"
import { fictionsRepoPublic } from "@/src/shared/infrastructure/supabase/anon-repos"
import {
  scenesRepoPublic,
  scenesSupabaseAdapter,
} from "@/src/scenes/infrastructure/supabase/scene.repository.impl"
import { getSceneByIdUseCase } from "@/src/scenes/application/get-scene-by-id.usecase"
import { getCitiesWithScenesUseCase } from "@/src/scenes/application/get-cities-with-scenes.usecase"
import { getCityFictionsWithScenesUseCase } from "@/src/scenes/application/get-city-fictions-with-scenes.usecase"
import { getSceneCountsByFictionIdsUseCase } from "@/src/scenes/application/get-scene-counts-by-fiction-ids.usecase"
import { listScenesUseCase } from "@/src/scenes/application/list-scenes.usecase"
import { listFictionScenesForContributeUseCase } from "@/src/scenes/application/list-fiction-scenes-for-contribute.usecase"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { Place } from "@/src/places/domain/place.entity"

const cookieRepo = scenesSupabaseAdapter

/** Single scene for admin edit (fresh read, cookie client — pending visible to staff/creator). */
export async function getSceneByIdUncached(id: string): Promise<Scene | null> {
  return getSceneByIdUseCase(id, cookieRepo)
}

/** Public scene detail — anon + cache (approved via RLS). */
export function getSceneByIdCached(id: string): Promise<Scene | null> {
  return unstable_cache(
    () => getSceneByIdUseCase(id, scenesRepoPublic),
    CacheKeys.scene(`id:${id}`),
    { ...CacheConfig.medium, tags: ["scenes", `scene-${id}`] },
  )()
}

/** Uncached fictions-with-scenes-in-city (same as cached viewer list, without cache). */
export async function getCityFictionsWithScenesUncached(cityId: string) {
  return getCityFictionsWithScenesUseCase(cityId, {
    listFictionIdsWithScenesInCity: (cid) => cookieRepo.listFictionIdsWithScenesInCity(cid),
    getFictionsByIds: (ids) => fictionsRepoPublic.getByIds(ids),
  })
}

/** Cities that have at least one active scene with video (viewer-aligned). */
export const getCitiesWithScenesForViewer = unstable_cache(
  async () => getCitiesWithScenesUseCase(null, cookieRepo),
  ["cities-with-scenes-viewer"],
  { revalidate: 60, tags: ["cities", "fictions", "scenes"] },
)

export function getCityFictionsWithScenesForViewer(cityId: string) {
  return unstable_cache(
    async () =>
      getCityFictionsWithScenesUseCase(cityId, {
        listFictionIdsWithScenesInCity: (id) => cookieRepo.listFictionIdsWithScenesInCity(id),
        getFictionsByIds: (ids) => fictionsRepoPublic.getByIds(ids),
      }),
    ["city-fictions-with-scenes", cityId],
    { revalidate: 60, tags: ["cities", "fictions", "scenes"] },
  )()
}

/** Active scene counts per fiction id, batched in a single query (public read). */
export function getSceneCountsByFictionIdsCached(fictionIds: string[]): Promise<Record<string, number>> {
  if (fictionIds.length === 0) return Promise.resolve({})
  const key = fictionIds.slice().sort().join(",")
  return unstable_cache(
    () => getSceneCountsByFictionIdsUseCase(fictionIds, cookieRepo),
    CacheKeys.scene(`counts:${key}`),
    { ...CacheConfig.short, tags: ["scenes"] },
  )()
}

/** Active scenes for a place — public anon cache. */
export function getScenesForPlaceCached(placeId: string): Promise<Scene[]> {
  return unstable_cache(
    () => listScenesUseCase({ placeId, active: true }, scenesRepoPublic),
    CacheKeys.scene(`place:${placeId}`),
    { ...CacheConfig.medium, tags: ["scenes", `place-${placeId}`] },
  )()
}

/** @deprecated Prefer `getScenesForPlaceCached` on public pages. */
export async function getScenesForPlace(placeId: string): Promise<Scene[]> {
  return getScenesForPlaceCached(placeId)
}

/** Active scenes for a fiction (public detail / watch page). */
export function getScenesForFictionCached(fictionId: string): Promise<Scene[]> {
  return unstable_cache(
    () => listScenesUseCase({ fictionId, active: true }, scenesRepoPublic),
    CacheKeys.scene(`fiction:${fictionId}`),
    { ...CacheConfig.medium, tags: ["scenes", `fiction-${fictionId}`] },
  )()
}

/** Lightweight approved scenes for contribute scene pickers. */
export function getFictionScenesForContributeCached(fictionId: string): Promise<Scene[]> {
  return unstable_cache(
    () => listFictionScenesForContributeUseCase(fictionId, scenesRepoPublic),
    CacheKeys.scene(`fiction-contribute:${fictionId}`),
    { ...CacheConfig.medium, tags: ["scenes", `fiction-${fictionId}`] },
  )()
}

/** @deprecated Prefer `getScenesForFictionCached` on public pages. */
export async function getScenesForFiction(fictionId: string): Promise<Scene[]> {
  return getScenesForFictionCached(fictionId)
}

/** All scenes with video in a city, grouped with their fiction slugs for linking. */
export function getScenesForCityCached(cityId: string): Promise<{
  scenes: Place[]
  fictionSlugById: Record<string, string>
}> {
  return unstable_cache(
    async () => {
      const fictions = await getCityFictionsWithScenesForViewer(cityId)
      const fictionIds = fictions.map((f) => f.id)
      if (fictionIds.length === 0) return { scenes: [], fictionSlugById: {} }
      // Adapter methods already use anon client — safe inside unstable_cache.
      const scenes = await cookieRepo.listScenesWithVideoInCity({ fictionIds, cityId })
      const fictionSlugById = Object.fromEntries(fictions.map((f) => [f.id, f.slug.trim()]))
      return { scenes, fictionSlugById }
    },
    CacheKeys.scene(`city-video:${cityId}`),
    { ...CacheConfig.medium, tags: ["scenes", "cities", "fictions", `city-${cityId}`] },
  )()
}
