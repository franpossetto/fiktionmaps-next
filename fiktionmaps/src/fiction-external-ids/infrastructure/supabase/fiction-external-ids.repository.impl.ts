import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import { mapAssetImagesToFiction } from "@/src/fictions/infrastructure/supabase/fiction.mappers"
import type { FictionExternalIdsRepositoryPort } from "@/src/fiction-external-ids/domain/fiction-external-ids.repository"

export function createFictionExternalIdsSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>,
): FictionExternalIdsRepositoryPort {
  return {
    async findActiveFictionByExternalId(provider, externalId) {
      const supabase = await getSupabase()
      const { data: link, error: linkErr } = await supabase
        .from("fiction_external_ids")
        .select("fiction_id")
        .eq("provider", provider)
        .eq("external_id", externalId)
        .maybeSingle()
      if (linkErr || !link) return null

      const { data: fictionData, error: fictionErr } = await supabase
        .from("fictions")
        .select("*")
        .eq("id", link.fiction_id)
        .eq("active", true)
        .maybeSingle()
      if (fictionErr || !fictionData) return null

      return mapAssetImagesToFiction(fictionData, [])
    },

    async upsertForFiction(fictionId, provider, externalId) {
      const supabase = await getSupabase()
      const { error: delError } = await supabase
        .from("fiction_external_ids")
        .delete()
        .eq("fiction_id", fictionId)
        .eq("provider", provider)
      if (delError) throw new Error(delError.message)

      const { error: insError } = await supabase.from("fiction_external_ids").insert({
        fiction_id: fictionId,
        provider,
        external_id: externalId,
      })
      if (insError) throw new Error(insError.message)
    },
  }
}

export const supabaseRepositoryAdapter = createFictionExternalIdsSupabaseAdapter(createClient)
