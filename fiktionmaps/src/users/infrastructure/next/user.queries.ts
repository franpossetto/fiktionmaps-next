import { createClient } from "@/lib/supabase/server"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { isUserAdminUseCase } from "@/src/users/application/is-user-admin.usecase"
import { createFictionLikesSupabaseAdapter } from "@/src/fiction-likes/infrastructure/supabase/fiction-likes.repository.impl"
import { getUserFictionLikesUseCase } from "@/src/fiction-likes/application/get-user-fiction-likes.usecase"

/** Dynamic read (no unstable_cache): must call createClient/cookies outside a cache scope. */
export async function getIsUserAdmin(userId: string): Promise<boolean> {
  return isUserAdminUseCase(userId, createUsersSupabaseAdapter(createClient))
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
