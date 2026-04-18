import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/supabase/database.types"
import type { Profile } from "@/src/users/domain/user.entity"
import type { UpdateProfileData } from "@/src/users/domain/user.dtos"
import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"

export function createUsersSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): UsersRepositoryPort {
  return {
    getProfile: cache(async (userId: string): Promise<Profile | null> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (error || !data) return null
      return data as Profile
    }),

    async updateProfile(
      userId: string,
      updates: UpdateProfileData
    ): Promise<Profile | null> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single()

      if (error || !data) return null
      return data as Profile
    },
  }
}

export const usersSupabaseAdapter = createUsersSupabaseAdapter(createClient)
