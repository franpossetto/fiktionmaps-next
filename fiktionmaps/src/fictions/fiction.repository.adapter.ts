import { createClient } from "@/lib/supabase/server"
import { ASSET_IMAGES_BUCKET } from "@/lib/asset-images/variant-sizes"
import type { FictionWithMedia } from "./fiction.domain"
import type { CreateFictionData, UpdateFictionData } from "./fiction.dtos"
import type { FictionsRepositoryPort } from "./fiction.repository.port"
import {
  getAllFictionsWithClient,
  mapAssetImagesToFiction,
  type AssetImageRow,
} from "./fiction-cached-read"

export const supabaseRepositoryAdapter: FictionsRepositoryPort = {
  async getAll(): Promise<FictionWithMedia[]> {
    const supabase = await createClient()
    return getAllFictionsWithClient(supabase)
  },

  async getById(id: string): Promise<FictionWithMedia | null> {
    const supabase = await createClient()
    const { data: fictionData, error: fError } = await supabase
      .from("fictions")
      .select("*")
      .eq("id", id)
      .single()
    if (fError || !fictionData) return null

    const { data: imagesData } = await supabase
      .from("asset_images")
      .select("entity_id, role, variant, url")
      .eq("entity_type", "fiction")
      .eq("entity_id", id)

    return mapAssetImagesToFiction(fictionData, (imagesData ?? []) as AssetImageRow[])
  },

  async create(data: CreateFictionData): Promise<FictionWithMedia | null> {
    const supabase = await createClient()
    const { data: row, error } = await supabase
      .from("fictions")
      .insert({
        title: data.title,
        type: data.type,
        year: data.year,
        author: data.author ?? null,
        genre: data.genre,
        description: data.description,
        active: data.active ?? true,
      })
      .select()
      .single()
    if (error || !row) return null
    return mapAssetImagesToFiction(row, [])
  },

  async update(
    id: string,
    updates: UpdateFictionData
  ): Promise<FictionWithMedia | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("fictions")
      .update(updates)
      .eq("id", id)
      .select()
      .single()
    if (error || !data) return null
    const { data: imagesData } = await supabase
      .from("asset_images")
      .select("entity_id, role, variant, url")
      .eq("entity_type", "fiction")
      .eq("entity_id", id)
    return mapAssetImagesToFiction(data, (imagesData ?? []) as AssetImageRow[])
  },

  async delete(id: string): Promise<boolean> {
    const supabase = await createClient()

    // 1. Get all asset_images for this fiction
    const { data: assetRows } = await supabase
      .from("asset_images")
      .select("id, url")
      .eq("entity_type", "fiction")
      .eq("entity_id", id)

    // 2. Remove image files from Storage (path from url: .../bucket-name/path)
    if (assetRows?.length) {
      const paths: string[] = []
      for (const row of assetRows) {
        const pathMatch = row.url?.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
        if (pathMatch?.[1]) paths.push(pathMatch[1])
      }
      if (paths.length) {
        try {
          await supabase.storage.from(ASSET_IMAGES_BUCKET).remove(paths)
        } catch {
          // continue even if storage remove fails (e.g. bucket missing)
        }
      }

      // 3. Delete asset_images rows
      await supabase
        .from("asset_images")
        .delete()
        .eq("entity_type", "fiction")
        .eq("entity_id", id)
    }

    // 4. Delete the fiction row
    const { data, error } = await supabase
      .from("fictions")
      .delete()
      .eq("id", id)
      .select("id")
    if (error) return false
    return Array.isArray(data) && data.length === 1
  },
}
