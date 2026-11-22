import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import type { AssetImageVariantRow } from "@/src/asset-images/domain/asset-image.repository"
import type { AssetImageRepairRepositoryPort } from "@/src/asset-images/domain/asset-image-repair.repository"
import { ASSET_IMAGES_BUCKET } from "@/lib/asset-images/variant-sizes"

type GetSupabase = () => Promise<SupabaseClient<Database>>

export function createAssetImagesSupabaseAdapter(
  getSupabase: GetSupabase,
): AssetImageRepairRepositoryPort {
  return {
    async listByEntityRole(
      entityType: string,
      entityId: string,
      role: string,
    ): Promise<AssetImageVariantRow[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("asset_images")
        .select("variant, url, focus_x, focus_y")
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
          focusX: row.focus_x,
          focusY: row.focus_y,
        }))
        .filter((row) => row.variant && row.url)
    },

    async downloadObject(path) {
      const supabase = await getSupabase()
      const { data, error } = await supabase.storage.from(ASSET_IMAGES_BUCKET).download(path)
      if (error || !data) {
        return { data: null, error: error?.message ?? "Failed to download source image" }
      }
      return { data: new Uint8Array(await data.arrayBuffer()), error: null }
    },

    async uploadObject(path, data, contentType) {
      const supabase = await getSupabase()
      const { error } = await supabase.storage.from(ASSET_IMAGES_BUCKET).upload(path, data, {
        contentType,
        upsert: true,
        cacheControl: "31536000",
      })
      if (error) return { url: null, error: error.message }
      const { data: publicUrl } = supabase.storage.from(ASSET_IMAGES_BUCKET).getPublicUrl(path)
      return { url: publicUrl.publicUrl, error: null }
    },

    async upsertVariant(input) {
      const supabase = await getSupabase()
      const { error } = await supabase.from("asset_images").upsert(
        {
          entity_type: input.entityType,
          entity_id: input.entityId,
          role: input.role,
          variant: input.variant,
          url: input.url,
          focus_x: input.focusX,
          focus_y: input.focusY,
        },
        { onConflict: "entity_type,entity_id,role,variant" },
      )
      return error?.message ?? null
    },

    async removeObject(path) {
      const supabase = await getSupabase()
      const { error } = await supabase.storage.from(ASSET_IMAGES_BUCKET).remove([path])
      if (error) console.warn("[asset-images repo] removeObject:", error.message)
    },
  }
}
