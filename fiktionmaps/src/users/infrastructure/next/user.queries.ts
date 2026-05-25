import { createClient } from "@/lib/supabase/server"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { getProfileUseCase } from "@/src/users/application/get-profile.usecase"
import { isUserAdminUseCase } from "@/src/users/application/is-user-admin.usecase"
import { isUserStaffUseCase } from "@/src/users/application/is-user-staff.usecase"
import type { Profile } from "@/src/users/domain/user.entity"
import { createFictionLikesSupabaseAdapter } from "@/src/fiction-likes/infrastructure/supabase/fiction-likes.repository.impl"
import { getUserFictionLikesUseCase } from "@/src/fiction-likes/application/get-user-fiction-likes.usecase"

/** Dynamic read (no unstable_cache): must call createClient/cookies outside a cache scope. */
export async function getIsUserAdmin(userId: string): Promise<boolean> {
  return isUserAdminUseCase(userId, createUsersSupabaseAdapter(createClient))
}

/** Admin or moderator (RLS «staff», contributions queue). Dynamic read — no unstable_cache. */
export async function getIsUserStaff(userId: string): Promise<boolean> {
  return isUserStaffUseCase(userId, createUsersSupabaseAdapter(createClient))
}

/** Dynamic read: staff session only (e.g. display name on contribution review). */
export async function getProfileForStaffSession(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  const staff = await isUserStaffUseCase(user.id, createUsersSupabaseAdapter(async () => supabase))
  if (!staff) return null
  return getProfileUseCase(userId, createUsersSupabaseAdapter(async () => supabase))
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
