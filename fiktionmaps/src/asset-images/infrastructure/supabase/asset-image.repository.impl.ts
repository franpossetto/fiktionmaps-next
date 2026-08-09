import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import type {
  AssetImageVariantRow,
  AssetImagesRepositoryPort,
} from "@/src/asset-images/domain/asset-image.repository"

type GetSupabase = () => Promise<SupabaseClient<Database>>

export function createAssetImagesSupabaseAdapter(getSupabase: GetSupabase): AssetImagesRepositoryPort {
  return {
    async listByEntityRole(
      entityType: string,
      entityId: string,
      role: string,
    ): Promise<AssetImageVariantRow[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("asset_images")
        .select("variant, url")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("role", role)

      if (error) {
        console.error("[asset-images repo] listByEntityRole:", error.message)
        return []
      }

      return (data ?? [])
        .map((row) => ({
          variant: String(row.variant ?? ""),
          url: String(row.url ?? "").trim(),
        }))
        .filter((row) => row.variant && row.url)
    },
  }
}
