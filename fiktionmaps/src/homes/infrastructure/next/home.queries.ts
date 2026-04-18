import { unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createHomesSupabaseAdapter } from "@/src/homes/infrastructure/supabase/home.repository.impl"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const repo = createHomesSupabaseAdapter(createClient)

export function getHomesByUserIdCached(userId: string) {
  return unstable_cache(
    () => repo.getByUserId(userId),
    CacheKeys.user(`homes:${userId}`),
    { ...CacheConfig.short, tags: [`user-homes-${userId}`, "homes"] }
  )()
}
