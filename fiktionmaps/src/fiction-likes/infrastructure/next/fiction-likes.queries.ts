import { unstable_cache } from "next/cache"
import { createAnonymousClient } from "@/lib/supabase/server"
import { createFictionLikesSupabaseAdapter } from "@/src/fiction-likes/infrastructure/supabase/fiction-likes.repository.impl"
import { createFictionsSupabaseAdapter } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { getFictionLikeCountsUseCase } from "@/src/fiction-likes/application/get-fiction-like-counts.usecase"
import { getLikedFictionsForUserUseCase } from "@/src/fiction-likes/application/get-liked-fictions-for-user.usecase"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { isUuidString } from "@/lib/validation/primitives"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"

const anon = () => Promise.resolve(createAnonymousClient())
const likesRepo = createFictionLikesSupabaseAdapter(anon)
const fictionsRepo = createFictionsSupabaseAdapter(anon)

/** Like counts per fiction id, batched in a single query (public read). */
export function getFictionLikeCountsCached(fictionIds: string[]): Promise<Record<string, number>> {
  const validIds = fictionIds.filter((id) => isUuidString(id))
  if (validIds.length === 0) return Promise.resolve({})
  const key = validIds.slice().sort().join(",")
  return unstable_cache(
    () => getFictionLikeCountsUseCase(validIds, likesRepo),
    ["fiction-likes-counts", key],
    { ...CacheConfig.short, tags: ["fiction-likes"] }
  )()
}

/** Active fictions liked by a profile user (public likes RLS). */
export function getLikedFictionsForUserCached(userId: string): Promise<FictionWithMedia[]> {
  if (!isUuidString(userId)) return Promise.resolve([])
  return unstable_cache(
    () =>
      getLikedFictionsForUserUseCase(userId, {
        likes: likesRepo,
        fictions: fictionsRepo,
      }),
    CacheKeys.user(`liked-fictions:${userId}`),
    { ...CacheConfig.short, tags: ["fiction-likes", `user-liked-fictions-${userId}`] },
  )()
}

