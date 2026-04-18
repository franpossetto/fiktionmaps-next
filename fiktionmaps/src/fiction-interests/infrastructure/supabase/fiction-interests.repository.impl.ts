import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import type { FictionInterestsRepositoryPort } from "@/src/fiction-interests/domain/fiction-interests.repository"
import type { FictionInterest } from "@/src/fiction-interests/domain/fiction-interest.entity"

export function createFictionInterestsSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): FictionInterestsRepositoryPort {
  return {
    async getInterestIdsByFictionId(fictionId: string): Promise<string[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("fiction_interests")
        .select("interest_id")
        .eq("fiction_id", fictionId)
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => r.interest_id as string)
    },

    async getByInterestIds(interestIds: string[]): Promise<FictionInterest[]> {
      if (interestIds.length === 0) return []
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("fiction_interests")
        .select("fiction_id, interest_id, weight")
        .in("interest_id", interestIds)
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => ({
        fictionId: r.fiction_id as string,
        interestId: r.interest_id as string,
        weight: Number(r.weight ?? 1),
      }))
    },

    async setForFiction(fictionId: string, interestIds: string[]): Promise<void> {
      const supabase = await getSupabase()
      const { error: delError } = await supabase
        .from("fiction_interests")
        .delete()
        .eq("fiction_id", fictionId)
      if (delError) throw new Error(delError.message)

      if (interestIds.length > 0) {
        const { error: insError } = await supabase.from("fiction_interests").insert(
          interestIds.map((interest_id) => ({
            fiction_id: fictionId,
            interest_id,
            weight: 1,
          }))
        )
        if (insError) throw new Error(insError.message)
      }
    },
  }
}

export const supabaseRepositoryAdapter = createFictionInterestsSupabaseAdapter(createClient)
