import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import type { UserInterestsRepositoryPort } from "@/src/user-interests/domain/user-interests.repository"

export function createUserInterestsSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): UserInterestsRepositoryPort {
  return {
    async getInterestIdsByUserId(userId: string): Promise<string[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("user_interests")
        .select("interest_id")
        .eq("user_id", userId)
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => r.interest_id as string)
    },

    async setForUser(userId: string, interestIds: string[]): Promise<void> {
      const supabase = await getSupabase()
      const { error: delError } = await supabase
        .from("user_interests")
        .delete()
        .eq("user_id", userId)
      if (delError) throw new Error(delError.message)

      if (interestIds.length > 0) {
        const { error: insError } = await supabase
          .from("user_interests")
          .insert(
            interestIds.map((interest_id) => ({
              user_id: userId,
              interest_id,
              source: "onboarding",
            }))
          )
        if (insError) throw new Error(insError.message)
      }
    },
  }
}
