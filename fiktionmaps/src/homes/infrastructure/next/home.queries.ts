import { createHomesSupabaseAdapter } from "@/src/homes/infrastructure/supabase/home.repository.impl"
import { createClient } from "@/lib/supabase/server"
import type { UserHome } from "@/src/homes/domain/home.entity"

/**
 * User-scoped homes read. Not shared-cached — needs the cookie-authenticated
 * Supabase client (RLS). Request dedupe lives in `getUserHomesAction` via React `cache()`.
 */
export async function getHomesByUserId(userId: string): Promise<UserHome[]> {
  const repo = createHomesSupabaseAdapter(createClient)
  return repo.getByUserId(userId)
}
