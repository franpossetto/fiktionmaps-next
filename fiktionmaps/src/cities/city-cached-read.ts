import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import type { City } from "./city.domain"

/**
 * Lists all cities. Does NOT use cookies() or createClient().
 * Use with createAnonymousClient() inside unstable_cache() so the cache scope stays free of dynamic data.
 */
export async function getAllCitiesWithClient(
  supabase: SupabaseClient<Database>
): Promise<City[]> {
  const { data, error } = await supabase.from("cities").select("*").order("name")
  if (error) return []
  return (data ?? []) as City[]
}
