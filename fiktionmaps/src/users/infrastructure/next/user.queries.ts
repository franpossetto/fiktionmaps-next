import { cache } from "react"
import { unstable_cache } from "next/cache"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { getProfileUseCase } from "@/src/users/application/get-profile.usecase"
import { isUserAdminUseCase } from "@/src/users/application/is-user-admin.usecase"
import { isUserStaffUseCase } from "@/src/users/application/is-user-staff.usecase"
import { isUserContributorUseCase } from "@/src/users/application/is-user-contributor.usecase"
import type { Profile } from "@/src/users/domain/user.entity"
import type { TopContributorProfile } from "@/src/contributions/domain/contribution.entity"
import { createFictionLikesSupabaseAdapter } from "@/src/fiction-likes/infrastructure/supabase/fiction-likes.repository.impl"
import { getUserFictionLikesUseCase } from "@/src/fiction-likes/application/get-user-fiction-likes.usecase"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const usersRepo = createUsersSupabaseAdapter(createClient)

/** Dynamic read (no unstable_cache): must call createClient/cookies outside a cache scope. */
export async function getIsUserAdmin(userId: string): Promise<boolean> {
  return isUserAdminUseCase(userId, usersRepo)
}

/** Admin or moderator (RLS «staff», contributions queue). Request-scoped dedupe via React cache. */
export const getIsUserStaff = cache(async (userId: string): Promise<boolean> => {
  return isUserStaffUseCase(userId, usersRepo)
})

/** Contributor, moderator, or admin — can access experimental features (e.g. AI wizards). */
export const getIsUserContributor = cache(async (userId: string): Promise<boolean> => {
  return isUserContributorUseCase(userId, usersRepo)
})

/** Dynamic read: staff session only (e.g. display name on contribution review). */
export async function getProfileForStaffSession(userId: string): Promise<Profile | null> {
  const sessionUserId = await getSessionUserId()
  if (!sessionUserId) return null
  const staff = await getIsUserStaff(sessionUserId)
  if (!staff) return null
  return getProfileUseCase(userId, usersRepo)
}

export type ProfilesPage = { profiles: TopContributorProfile[]; totalCount: number }

export function getProfilesPageCached(page: number, pageSize: number): Promise<ProfilesPage> {
  const safePage = Math.max(1, page)
  const safeSize = Math.max(1, pageSize)
  return unstable_cache(
    async (): Promise<ProfilesPage> => {
      const supabase = createAnonymousClient()
      const from = (safePage - 1) * safeSize
      const to = from + safeSize - 1
      const { data, error, count } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, fpp_total", { count: "exact" })
        .order("fpp_total", { ascending: false })
        .order("username", { ascending: true, nullsFirst: false })
        .range(from, to)

      if (error || !data) return { profiles: [], totalCount: 0 }

      return {
        profiles: data.map((row) => ({
          id: row.id,
          username: row.username,
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
          fppTotal: row.fpp_total ?? 0,
        })),
        totalCount: count ?? 0,
      }
    },
    ["profiles-page", String(safePage), String(safeSize)],
    { ...CacheConfig.medium, tags: ["profiles"] },
  )()
}

/** Dynamic read for a per-user/per-fiction like state on SSR pages. */
export async function getCurrentUserHasLikedFiction(fictionId: string): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return false

  const ids = await getUserFictionLikesUseCase(user.id, createFictionLikesSupabaseAdapter(createClient))
  return ids.includes(fictionId)
}
