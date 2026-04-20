import { unstable_cache } from "next/cache"
import { createAnonymousClient } from "@/lib/supabase/server"
import { createFictionLikesSupabaseAdapter } from "@/src/fiction-likes/infrastructure/supabase/fiction-likes.repository.impl"
import { getFictionLikeCountsUseCase } from "@/src/fiction-likes/application/get-fiction-like-counts.usecase"
import { isUuidString } from "@/lib/validation/primitives"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const anon = () => Promise.resolve(createAnonymousClient())
const repo = createFictionLikesSupabaseAdapter(anon)

/** Like counts per fiction id, batched in a single query (public read). */
export function getFictionLikeCountsCached(fictionIds: string[]): Promise<Record<string, number>> {
  const validIds = fictionIds.filter((id) => isUuidString(id))
  if (validIds.length === 0) return Promise.resolve({})
  const key = validIds.slice().sort().join(",")
  return unstable_cache(
    () => getFictionLikeCountsUseCase(validIds, repo),
    ["fiction-likes-counts", key],
    { ...CacheConfig.short, tags: ["fiction-likes"] }
  )()
}
