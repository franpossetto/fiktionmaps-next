import { cache } from "react"
import { unstable_cache } from "next/cache"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser, getSessionUserId } from "@/lib/auth/auth.service"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { getProfileUseCase } from "@/src/users/application/get-profile.usecase"
import { getProfileByUsernameUseCase } from "@/src/users/application/get-profile-by-username.usecase"
import { getProfilesPageUseCase } from "@/src/users/application/get-profiles-page.usecase"
import { isUserAdminUseCase } from "@/src/users/application/is-user-admin.usecase"
import { isUserStaffUseCase } from "@/src/users/application/is-user-staff.usecase"
import { isUserContributorUseCase } from "@/src/users/application/is-user-contributor.usecase"
import type { Profile } from "@/src/users/domain/user.entity"
import type { ProfilesPage } from "@/src/users/domain/user.views"
import {
  mapProfileToUserProfile,
  type ProfileWithOnboarding,
} from "@/src/users/infrastructure/next/user.mappers"
import { createFictionLikesSupabaseAdapter } from "@/src/fiction-likes/infrastructure/supabase/fiction-likes.repository.impl"
import { getUserFictionLikesUseCase } from "@/src/fiction-likes/application/get-user-fiction-likes.usecase"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const usersRepo = createUsersSupabaseAdapter(createClient)
const anonUsersRepo = createUsersSupabaseAdapter(() => Promise.resolve(createAnonymousClient()))

export type SessionAccount = {
  email: string | null
  profile: ProfileWithOnboarding | null
}

/**
 * Session identity + profile for the account screen.
 * Dynamic read (session-scoped, no `unstable_cache`) so a role change is never served stale.
 */
export const getSessionAccount = cache(async (): Promise<SessionAccount> => {
  const { data: authUser } = await getAuthenticatedUser()
  if (!authUser) return { email: null, profile: null }

  const profile = await getProfileUseCase(authUser.id, usersRepo)
  return {
    email: authUser.email?.trim() || null,
    profile: profile ? mapProfileToUserProfile(profile) : null,
  }
})

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

/**
 * Profile by username for logged-in viewers (middleware also gates `/u/*`).
 * Request-scoped; uses the session client so RLS applies.
 */
export const getProfileByUsernameForSession = cache(
  async (username: string): Promise<ProfileWithOnboarding | null> => {
    const sessionUserId = await getSessionUserId()
    if (!sessionUserId) return null
    const profile = await getProfileByUsernameUseCase(username, usersRepo)
    if (!profile) return null
    return mapProfileToUserProfile(profile)
  },
)

export type { ProfilesPage } from "@/src/users/domain/user.views"

export function getProfilesPageCached(page: number, pageSize: number): Promise<ProfilesPage> {
  const safePage = Math.max(1, page)
  const safeSize = Math.max(1, pageSize)
  return unstable_cache(
    () => getProfilesPageUseCase(safePage, safeSize, anonUsersRepo),
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
