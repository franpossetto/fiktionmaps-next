import {
  ASSET_VIDEOS_BUCKET,
  tryParseStoragePathFromVideoUrl,
} from "@/lib/asset-videos/asset-videos-bucket"
import { createClient } from "@/lib/supabase/server"
import type { Scene } from "./scene.domain"
import type { CreateSceneData, UpdateSceneData } from "./scene.dtos"
import type { SceneListFilters, ScenesRepositoryPort } from "./scene.repository.port"

type SceneRowWithPlace = {
  id: string
  fiction_id: string
  place_id: string
  title: string
  description: string
  quote: string | null
  timestamp_label: string | null
  season: number | null
  episode: number | null
  episode_title: string | null
  video_url: string | null
  sort_order: number
  active: boolean
  places?: { location_id: string | null } | { location_id: string | null }[] | null
}

function mapRow(row: SceneRowWithPlace): Scene {
  const placesRaw = row.places
  const placeObj = Array.isArray(placesRaw) ? placesRaw[0] : placesRaw
  const locationId =
    placeObj && typeof placeObj === "object" && "location_id" in placeObj
      ? (placeObj.location_id as string | null) ?? ""
      : ""

  return {
    id: row.id,
    placeId: row.place_id,
    fictionId: row.fiction_id,
    locationId,
    title: row.title,
    description: row.description,
    quote: row.quote,
    timestamp: row.timestamp_label,
    season: row.season,
    episode: row.episode,
    episodeTitle: row.episode_title,
    videoUrl: row.video_url,
    sortOrder: row.sort_order,
    active: row.active,
    thumbnail: null,
  }
}

const sceneSelect = `
  id,
  fiction_id,
  place_id,
  title,
  description,
  quote,
  timestamp_label,
  season,
  episode,
  episode_title,
  video_url,
  sort_order,
  active,
  places!inner (
    location_id
  )
`

async function removeVideoObjectIfAny(supabase: Awaited<ReturnType<typeof createClient>>, videoUrl: string | null) {
  const path = tryParseStoragePathFromVideoUrl(videoUrl, ASSET_VIDEOS_BUCKET)
  if (!path) return
  const { error } = await supabase.storage.from(ASSET_VIDEOS_BUCKET).remove([path])
  if (error) console.warn("[scenes repo] storage remove video:", error.message)
}

async function fetchSceneById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<Scene | null> {
  const { data, error } = await supabase.from("scenes").select(sceneSelect).eq("id", id).maybeSingle()
  if (error) {
    console.error("[scenes repo] getById:", error.message)
    return null
  }
  if (!data) return null
  return mapRow(data as SceneRowWithPlace)
}

export const scenesSupabaseAdapter: ScenesRepositoryPort = {
  async getAll(): Promise<Scene[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("scenes")
      .select(sceneSelect)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[scenes repo] getAll:", error.message)
      return []
    }
    return (data as SceneRowWithPlace[] | null)?.map(mapRow) ?? []
  },

  async getByLocationId(locationId: string): Promise<Scene[]> {
    const supabase = await createClient()
    const { data: placeRows, error: pe } = await supabase
      .from("places")
      .select("id")
      .eq("location_id", locationId)
    if (pe) {
      console.error("[scenes repo] getByLocationId places:", pe.message)
      return []
    }
    const placeIds = (placeRows ?? []).map((p) => p.id)
    if (placeIds.length === 0) return []
    const { data, error } = await supabase
      .from("scenes")
      .select(sceneSelect)
      .in("place_id", placeIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[scenes repo] getByLocationId:", error.message)
      return []
    }
    return (data as SceneRowWithPlace[] | null)?.map(mapRow) ?? []
  },

  async getByFictionId(fictionId: string): Promise<Scene[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("scenes")
      .select(sceneSelect)
      .eq("fiction_id", fictionId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[scenes repo] getByFictionId:", error.message)
      return []
    }
    return (data as SceneRowWithPlace[] | null)?.map(mapRow) ?? []
  },

  async getByPlaceId(placeId: string): Promise<Scene[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("scenes")
      .select(sceneSelect)
      .eq("place_id", placeId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[scenes repo] getByPlaceId:", error.message)
      return []
    }
    return (data as SceneRowWithPlace[] | null)?.map(mapRow) ?? []
  },

  async getById(id: string): Promise<Scene | null> {
    const supabase = await createClient()
    return fetchSceneById(supabase, id)
  },

  async list(filters: SceneListFilters): Promise<Scene[]> {
    const supabase = await createClient()

    let placeIdsForLocation: string[] | null = null
    if (filters.locationId) {
      const { data: placeRows, error: pe } = await supabase
        .from("places")
        .select("id")
        .eq("location_id", filters.locationId)
      if (pe) {
        console.error("[scenes repo] list places:", pe.message)
        return []
      }
      placeIdsForLocation = (placeRows ?? []).map((p) => p.id)
      if (placeIdsForLocation.length === 0) return []
    }

    let q = supabase.from("scenes").select(sceneSelect)

    if (filters.fictionId) q = q.eq("fiction_id", filters.fictionId)
    if (filters.placeId) q = q.eq("place_id", filters.placeId)
    if (placeIdsForLocation) q = q.in("place_id", placeIdsForLocation)
    if (filters.active !== undefined) q = q.eq("active", filters.active)

    const { data, error } = await q
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[scenes repo] list:", error.message)
      return []
    }
    return (data as SceneRowWithPlace[] | null)?.map(mapRow) ?? []
  },

  async create(data: CreateSceneData, createdBy?: string | null): Promise<Scene | null> {
    const supabase = await createClient()
    const insert = {
      fiction_id: data.fictionId,
      place_id: data.placeId,
      title: data.title.trim(),
      description: data.description.trim(),
      quote: data.quote?.trim() || null,
      timestamp_label: data.timestampLabel?.trim() || null,
      season: data.season ?? null,
      episode: data.episode ?? null,
      episode_title: data.episodeTitle?.trim() || null,
      video_url: data.videoUrl?.trim() || null,
      sort_order: data.sortOrder ?? 0,
      active: data.active ?? true,
      created_by: createdBy ?? null,
    }

    const { data: inserted, error } = await supabase.from("scenes").insert(insert).select("id").single()

    if (error || !inserted?.id) {
      console.error("[scenes repo] create:", error?.message)
      return null
    }
    return fetchSceneById(supabase, inserted.id as string)
  },

  async update(id: string, data: UpdateSceneData): Promise<Scene | null> {
    const supabase = await createClient()

    const { data: existing } = await supabase.from("scenes").select("video_url").eq("id", id).maybeSingle()
    const prevUrl = existing?.video_url as string | null | undefined

    const patch: Record<string, unknown> = {}
    if (data.fictionId !== undefined) patch.fiction_id = data.fictionId
    if (data.placeId !== undefined) patch.place_id = data.placeId
    if (data.title !== undefined) patch.title = data.title.trim()
    if (data.description !== undefined) patch.description = data.description.trim()
    if (data.quote !== undefined) patch.quote = data.quote?.trim() || null
    if (data.timestampLabel !== undefined) patch.timestamp_label = data.timestampLabel?.trim() || null
    if (data.season !== undefined) patch.season = data.season
    if (data.episode !== undefined) patch.episode = data.episode
    if (data.episodeTitle !== undefined) patch.episode_title = data.episodeTitle?.trim() || null
    if (data.videoUrl !== undefined) {
      patch.video_url = data.videoUrl?.trim() || null
      if (prevUrl && prevUrl !== patch.video_url) {
        await removeVideoObjectIfAny(supabase, prevUrl)
      }
    }
    if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder
    if (data.active !== undefined) patch.active = data.active

    if (Object.keys(patch).length === 0) {
      return fetchSceneById(supabase, id)
    }

    const { error } = await supabase.from("scenes").update(patch).eq("id", id)

    if (error) {
      console.error("[scenes repo] update:", error.message)
      return null
    }
    return fetchSceneById(supabase, id)
  },

  async delete(id: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: existing } = await supabase.from("scenes").select("video_url").eq("id", id).maybeSingle()
    const videoUrl = existing?.video_url as string | null | undefined
    await removeVideoObjectIfAny(supabase, videoUrl ?? null)

    const { error } = await supabase.from("scenes").delete().eq("id", id)
    if (error) {
      console.error("[scenes repo] delete:", error.message)
      return false
    }
    return true
  },
}
