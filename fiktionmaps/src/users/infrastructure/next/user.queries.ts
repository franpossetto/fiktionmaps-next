import { unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { getProfileUseCase } from "@/src/users/application/get-profile.usecase"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

export function getProfileByUserIdCached(userId: string) {
  return unstable_cache(
    () => getProfileUseCase(userId, createUsersSupabaseAdapter(createClient)),
    CacheKeys.user(`profile:${userId}`),
    { ...CacheConfig.short, tags: [`user-profile-${userId}`, "profiles"] }
  )()
}
