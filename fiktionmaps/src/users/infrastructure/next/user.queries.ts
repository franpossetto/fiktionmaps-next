import { createClient } from "@/lib/supabase/server"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { isUserAdminUseCase } from "@/src/users/application/is-user-admin.usecase"

/** Dynamic read (no unstable_cache): must call createClient/cookies outside a cache scope. */
export async function getIsUserAdmin(userId: string): Promise<boolean> {
  return isUserAdminUseCase(userId, createUsersSupabaseAdapter(createClient))
}
