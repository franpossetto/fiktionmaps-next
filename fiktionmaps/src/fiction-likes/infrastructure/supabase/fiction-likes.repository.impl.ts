import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import type { FictionLikesRepositoryPort } from "@/src/fiction-likes/domain/fiction-likes.repository"

export function createFictionLikesSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): FictionLikesRepositoryPort {
  return {
    async countByIds(fictionIds: string[]): Promise<Record<string, number>> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("fiction_likes")
        .select("fiction_id")
        .in("fiction_id", fictionIds)
      if (error) throw new Error(error.message)

      const counts: Record<string, number> = {}
      for (const id of fictionIds) counts[id] = 0
      for (const r of data ?? []) {
        const id = r.fiction_id as string
        counts[id] = (counts[id] ?? 0) + 1
      }
      return counts
    },

    async getLikedFictionIdsByUserId(userId: string): Promise<string[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("fiction_likes")
        .select("fiction_id")
        .eq("user_id", userId)
      if (error) throw new Error(error.message)
      return (data ?? []).map((r) => r.fiction_id as string)
    },

    async toggle(userId: string, fictionId: string): Promise<{ liked: boolean; likeCount: number }> {
      const supabase = await getSupabase()
      const { data: existing } = await supabase
        .from("fiction_likes")
        .select("fiction_id")
        .eq("user_id", userId)
        .eq("fiction_id", fictionId)
        .maybeSingle()

      const currentlyLiked = !!existing

      if (currentlyLiked) {
        const { error } = await supabase
          .from("fiction_likes")
          .delete()
          .eq("user_id", userId)
          .eq("fiction_id", fictionId)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from("fiction_likes")
          .insert({ user_id: userId, fiction_id: fictionId })
        if (error) throw new Error(error.message)
      }

      const { data: countRows, error: countError } = await supabase
        .from("fiction_likes")
        .select("fiction_id")
        .eq("fiction_id", fictionId)
      if (countError) throw new Error(countError.message)

      return { liked: !currentlyLiked, likeCount: (countRows ?? []).length }
    },

    async setForUser(userId: string, fictionIds: string[]): Promise<void> {
      const supabase = await getSupabase()
      const { error: delError } = await supabase
        .from("fiction_likes")
        .delete()
        .eq("user_id", userId)
      if (delError) throw new Error(delError.message)

      if (fictionIds.length > 0) {
        const { error: insError } = await supabase
          .from("fiction_likes")
          .insert(fictionIds.map((fiction_id) => ({ user_id: userId, fiction_id })))
        if (insError) throw new Error(insError.message)
      }
    },
  }
}
