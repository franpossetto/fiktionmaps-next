import { unstable_cache } from "next/cache"
import { fictionsRepoPublic } from "@/src/shared/infrastructure/supabase/anon-repos"
import { scenesSupabaseAdapter } from "@/src/scenes/infrastructure/supabase/scene.repository.impl"
import { getSceneByIdUseCase } from "@/src/scenes/application/get-scene-by-id.usecase"
import { getCitiesWithScenesUseCase } from "@/src/scenes/application/get-cities-with-scenes.usecase"
import { getCityFictionsWithScenesUseCase } from "@/src/scenes/application/get-city-fictions-with-scenes.usecase"
import { getSceneCountsByFictionIdsUseCase } from "@/src/scenes/application/get-scene-counts-by-fiction-ids.usecase"
import { listScenesUseCase } from "@/src/scenes/application/list-scenes.usecase"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { Place } from "@/src/places/domain/place.entity"

const repo = scenesSupabaseAdapter

/** Single scene for admin edit (fresh read, not cached). */
export async function getSceneByIdUncached(id: string): Promise<Scene | null> {
  return getSceneByIdUseCase(id, repo)
}

/** Uncached fictions-with-scenes-in-city (same as cached viewer list, without cache). */
export async function getCityFictionsWithScenesUncached(cityId: string) {
  return getCityFictionsWithScenesUseCase(cityId, {
    listFictionIdsWithScenesInCity: (cid) => repo.listFictionIdsWithScenesInCity(cid),
    getFictionsByIds: (ids) => fictionsRepoPublic.getByIds(ids),
  })
}

/** Cities that have at least one active scene with video (viewer-aligned). */
export const getCitiesWithScenesForViewer = unstable_cache(
  async () => getCitiesWithScenesUseCase(null, repo),
  ["cities-with-scenes-viewer"],
  { revalidate: 60, tags: ["cities", "fictions", "scenes"] }
)

export function getCityFictionsWithScenesForViewer(cityId: string) {
  return unstable_cache(
    async () =>
      getCityFictionsWithScenesUseCase(cityId, {
        listFictionIdsWithScenesInCity: (id) => repo.listFictionIdsWithScenesInCity(id),
        getFictionsByIds: (ids) => fictionsRepoPublic.getByIds(ids),
      }),
    ["city-fictions-with-scenes", cityId],
    { revalidate: 60, tags: ["cities", "fictions", "scenes"] }
  )()
}

/** Active scene counts per fiction id, batched in a single query (public read). */
export function getSceneCountsByFictionIdsCached(fictionIds: string[]): Promise<Record<string, number>> {
  if (fictionIds.length === 0) return Promise.resolve({})
  const key = fictionIds.slice().sort().join(",")
  return unstable_cache(
    () => getSceneCountsByFictionIdsUseCase(fictionIds, repo),
    CacheKeys.scene(`counts:${key}`),
    { ...CacheConfig.short, tags: ["scenes"] }
  )()
}

/**
 * Active scenes for a place (`locations.id` / `places.id`).
 * Not wrapped in `unstable_cache`: `repo.list` uses the cookie-backed Supabase client; dynamic data sources are not allowed inside Next cache scopes.
 */
export async function getScenesForPlace(placeId: string): Promise<Scene[]> {
  return listScenesUseCase({ placeId, active: true }, repo)
}

/** Active scenes for a fiction (public detail / watch page). */
export async function getScenesForFiction(fictionId: string): Promise<Scene[]> {
  return listScenesUseCase({ fictionId, active: true }, repo)
}

/** All scenes with video in a city, grouped with their fiction slugs for linking. */
export async function getScenesForCityCached(cityId: string): Promise<{
  scenes: Place[]
  fictionSlugById: Record<string, string>
}> {
  const fictions = await getCityFictionsWithScenesForViewer(cityId)
  const fictionIds = fictions.map((f) => f.id)
  if (fictionIds.length === 0) return { scenes: [], fictionSlugById: {} }
  const scenes = await repo.listScenesWithVideoInCity({ fictionIds, cityId })
  const fictionSlugById = Object.fromEntries(fictions.map((f) => [f.id, f.slug.trim()]))
  return { scenes, fictionSlugById }
}
