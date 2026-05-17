import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import type { ProfilesReaderPort } from "@/src/contributions/domain/profiles-reader.port"

export function createProfilesReaderSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>,
): ProfilesReaderPort {
  return {
    async getRole(userId: string): Promise<string | null> {
      const supabase = await getSupabase()
      const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
      if (error) {
        console.error("[profiles reader] getRole error:", error.message)
        return null
      }
      return data?.role ?? null
    },
  }
}

export const profilesReaderSupabaseAdapter = createProfilesReaderSupabaseAdapter(createClient)
