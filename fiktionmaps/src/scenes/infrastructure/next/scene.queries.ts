import { unstable_cache } from "next/cache"
import { fictionsRepoPublic } from "@/src/shared/infrastructure/supabase/anon-repos"
import { scenesSupabaseAdapter } from "@/src/scenes/infrastructure/supabase/scene.repository.impl"
import { getSceneByIdUseCase } from "@/src/scenes/application/get-scene-by-id.usecase"
import { getCitiesWithScenesUseCase } from "@/src/scenes/application/get-cities-with-scenes.usecase"
import { getCityFictionsWithScenesUseCase } from "@/src/scenes/application/get-city-fictions-with-scenes.usecase"
import { getSceneCountsByFictionIdsUseCase } from "@/src/scenes/application/get-scene-counts-by-fiction-ids.usecase"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"
import type { Scene } from "@/src/scenes/domain/scene.entity"

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
