import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../../supabase/database.types"
import type { FictionWithMedia } from "./fiction.domain"

export type AssetImageRow = { entity_id: string; role: string; variant: string; url: string }

export function mapAssetImagesToFiction(
  fiction: Record<string, unknown>,
  rows: AssetImageRow[]
): FictionWithMedia {
  const base = fiction as unknown as FictionWithMedia
  let coverImage: string | null = null
  let coverImageLarge: string | null = null
  let bannerImage: string | null = null
  for (const r of rows) {
    if (r.role === "cover" && r.variant === "sm") coverImage = r.url
    if (r.role === "cover" && r.variant === "lg") coverImageLarge = r.url
    if (r.role === "banner" && r.variant === "lg") bannerImage = r.url
  }
  return {
    ...base,
    coverImage: coverImage ?? undefined,
    coverImageLarge: coverImageLarge ?? undefined,
    bannerImage: bannerImage ?? undefined,
  }
}

/**
 * Fetches all fictions with asset images. Does NOT use cookies() or createClient().
 * Use with createAnonymousClient() inside unstable_cache() so the cache scope stays free of dynamic data.
 */
export async function getAllFictionsWithClient(
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
