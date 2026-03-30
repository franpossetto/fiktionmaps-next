import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { ASSET_IMAGES_BUCKET } from "@/lib/asset-images/variant-sizes"
import type { Database } from "@/supabase/database.types"
import type { FictionWithMedia } from "./fiction.domain"
import type { CreateFictionData, UpdateFictionData } from "./fiction.dtos"
import { mapAssetImagesToFiction, type AssetImageRow } from "./fiction.mappers"
import type { FictionsRepositoryPort } from "./fiction.repository.port"

async function loadAllFictionsWithImages(
  supabase: SupabaseClient<Database>
): Promise<FictionWithMedia[]> {
  const { data: fictionsData, error: fError } = await supabase
    .from("fictions")
    .select("*")
    .order("title")
  if (fError || !fictionsData?.length) return (fictionsData ?? []) as FictionWithMedia[]

  const ids = fictionsData.map((f) => f.id)
  const { data: imagesData } = await supabase
    .from("asset_images")
    .select("entity_id, role, variant, url")
    .eq("entity_type", "fiction")
    .in("entity_id", ids)

  const imagesByEntity = new Map<string, AssetImageRow[]>()
  for (const row of imagesData ?? []) {
    const list = imagesByEntity.get(row.entity_id) ?? []
    list.push(row as AssetImageRow)
    imagesByEntity.set(row.entity_id, list)
  }

  return fictionsData.map((f) =>
    mapAssetImagesToFiction(f, imagesByEntity.get(f.id) ?? [])
  )
}

async function loadFictionsByIdsWithImages(
  supabase: SupabaseClient<Database>,
  ids: string[]
): Promise<FictionWithMedia[]> {
  if (ids.length === 0) return []

  const { data: fictionsData, error: fError } = await supabase
    .from("fictions")
    .select("*")
    .in("id", ids)
    .eq("active", true)
    .order("title")

  if (fError || !fictionsData?.length) return []

  const fictionIds = fictionsData.map((f) => f.id)
  const { data: imagesData } = await supabase
    .from("asset_images")
    .select("entity_id, role, variant, url")
    .eq("entity_type", "fiction")
    .in("entity_id", fictionIds)

  const imagesByEntity = new Map<string, AssetImageRow[]>()
  for (const row of imagesData ?? []) {
    const list = imagesByEntity.get(row.entity_id) ?? []
    list.push(row as AssetImageRow)
    imagesByEntity.set(row.entity_id, list)
  }

  return fictionsData.map((f) =>
    mapAssetImagesToFiction(f, imagesByEntity.get(f.id) ?? [])
  )
}

export function createFictionsSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): FictionsRepositoryPort {
  return {
    async getAll(): Promise<FictionWithMedia[]> {
      const supabase = await getSupabase()
      return loadAllFictionsWithImages(supabase)
    },

    async getByIds(ids: string[]): Promise<FictionWithMedia[]> {
      const supabase = await getSupabase()
      return loadFictionsByIdsWithImages(supabase, ids)
    },

    async getById(id: string): Promise<FictionWithMedia | null> {
      const supabase = await getSupabase()
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
      const supabase = await getSupabase()
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
          duration_sec: data.duration_sec ?? null,
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
      const supabase = await getSupabase()
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
      const supabase = await getSupabase()

      const { data: assetRows } = await supabase
        .from("asset_images")
        .select("id, url")
        .eq("entity_type", "fiction")
        .eq("entity_id", id)

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

        await supabase
          .from("asset_images")
          .delete()
          .eq("entity_type", "fiction")
          .eq("entity_id", id)
      }

      const { data, error } = await supabase
        .from("fictions")
        .delete()
        .eq("id", id)
        .select("id")
      if (error) return false
      return Array.isArray(data) && data.length === 1
    },
  }
}

export const supabaseRepositoryAdapter = createFictionsSupabaseAdapter(createClient)
