import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import type { InterestRepositoryPort } from "@/src/interests/domain/interest.repository"
import type { InterestCatalogItem } from "@/src/interests/domain/interest.entity"

export function createInterestSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): InterestRepositoryPort {
  return {
    async getCatalogByLocale(locale: string): Promise<InterestCatalogItem[]> {
      const supabase = await getSupabase()

      const { data: interests, error: iError } = await supabase
        .from("interests")
        .select("id, key")
        .eq("active", true)
        .order("key")

      if (iError) throw new Error(iError.message)

      const interestRows = (interests ?? []) as { id: string; key: string }[]
      if (interestRows.length === 0) return []

      const ids = interestRows.map((i) => i.id)
      const { data: translations, error: tError } = await supabase
        .from("interest_translations")
        .select("interest_id, label")
        .eq("locale", locale)
        .in("interest_id", ids)

      if (tError) throw new Error(tError.message)

      const labelByInterestId = new Map<string, string>()
      for (const r of translations ?? []) {
        labelByInterestId.set(r.interest_id as string, r.label as string)
      }

      return interestRows.map((i) => ({
        id: i.id,
        key: i.key,
        label: labelByInterestId.get(i.id) ?? i.key,
      }))
    },
  }
}
