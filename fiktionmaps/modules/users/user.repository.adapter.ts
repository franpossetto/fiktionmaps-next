import { createClient } from "@/lib/supabase/server"
import type { Profile } from "./user.domain"
import type { UpdateProfileData } from "./user.dtos"
import type { UsersRepositoryPort } from "./user.repository.port"

export const supabaseRepositoryAdapter: UsersRepositoryPort = {
  async getProfile(userId: string): Promise<Profile | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (error || !data) return null
    return data
  },

  async updateProfile(
    userId: string,
    updates: UpdateProfileData
  ): Promise<Profile | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single()

    if (error || !data) return null
    return data
  },
}
