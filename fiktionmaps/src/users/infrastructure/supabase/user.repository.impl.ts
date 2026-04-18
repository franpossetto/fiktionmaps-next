import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database, Tables } from "@/supabase/database.types"
import type { Profile } from "@/src/users/domain/user.entity"
import type { UpdateProfileData, UserRole } from "@/src/users/domain/user.dtos"
import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"

function mapProfileRow(row: Tables<"profiles">): Profile {
  const role: UserRole = row.role === "admin" ? "admin" : "user"
  return {
    id: row.id,
    username: row.username,
    avatar_url: row.avatar_url,
    bio: row.bio,
    gender: row.gender,
    phone: row.phone,
    date_of_birth: row.date_of_birth,
    onboarding_completed: row.onboarding_completed,
    role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

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
      return mapProfileRow(data)
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
      return mapProfileRow(data)
    },
  }
}

export const usersSupabaseAdapter = createUsersSupabaseAdapter(createClient)
