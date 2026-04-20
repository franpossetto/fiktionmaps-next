import {
  ASSET_VIDEOS_BUCKET,
  tryParseStoragePathFromVideoUrl,
} from "@/lib/asset-videos/asset-videos-bucket"
import type { MapBbox } from "@/lib/validation/map-query"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import type { City } from "@/src/cities/domain/city.entity"
import type { Location } from "@/src/locations/domain/location.entity"
import type { ProfileScenePreview, Scene } from "@/src/scenes/domain/scene.entity"
import type { CreateSceneData, UpdateSceneData } from "@/src/scenes/domain/scene.schemas"
import type { SceneListFilters, ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"

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

type SupabaseLike = Awaited<ReturnType<typeof createClient>>
type AnonSupabase = ReturnType<typeof createAnonymousClient>

type ImgRow = { entity_id: string; role: string; variant: string; url: string }

function pickThumb(rows: ImgRow[]): string | null {
  if (!rows.length) return null
  const sm = rows.filter((r) => r.variant === "sm")
  const pool = sm.length ? sm : rows
  const byRole = (role: string) => pool.find((r) => r.role === role)
  return byRole("hero")?.url ?? byRole("cover")?.url ?? byRole("avatar")?.url ?? pool[0]?.url ?? null
}

async function removeVideoObjectIfAny(supabase: SupabaseLike, videoUrl: string | null) {
  const path = tryParseStoragePathFromVideoUrl(videoUrl, ASSET_VIDEOS_BUCKET)
  if (!path) return
  const { error } = await supabase.storage.from(ASSET_VIDEOS_BUCKET).remove([path])
  if (error) console.warn("[scenes repo] storage remove video:", error.message)
}

async function fetchSceneById(
  supabase: SupabaseLike,
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

type LocFromJoin = {
  id?: string
  name?: string
  formatted_address?: string
  latitude?: number
  longitude?: number
  city_id?: string
}

function locationFromSceneJoinRow(r: unknown): LocFromJoin | null {
  const row = r as { places?: unknown }
  const pRaw = row.places
  const placeObj = Array.isArray(pRaw) ? pRaw[0] : pRaw
  if (!placeObj || typeof placeObj !== "object") return null
  const locRaw = "locations" in placeObj ? (placeObj as { locations?: unknown }).locations : undefined
  const locObj = Array.isArray(locRaw) ? locRaw[0] : locRaw
  if (!locObj || typeof locObj !== "object") return null
  return locObj as LocFromJoin
}

async function fetchScenesWithVideoForPlaceIds(
  supabase: AnonSupabase,
  fictionIds: string[],
  placeIds: string[],
): Promise<Location[]> {
  if (placeIds.length === 0 || fictionIds.length === 0) return []

  const { data: sceneRows, error: sceneError } = await supabase
    .from("scenes")
    .select(
      `
        id,
        fiction_id,
        place_id,
        title,
        description,
        quote,
        video_url,
        sort_order,
        places!inner (
          location_id,
          locations!inner (
            id,
            name,
            formatted_address,
            latitude,
            longitude,
            city_id
          )
        )
      `,
    )
    .eq("active", true)
    .not("video_url", "is", null)
    .in("fiction_id", fictionIds)
    .in("place_id", placeIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (sceneError) {
    console.error("[scenes repo] fetchScenesWithVideoForPlaceIds scenes:", sceneError.message)
    return []
  }

  const rows = sceneRows ?? []
  const sceneIds = rows.map((r) => (r as { id?: string }).id).filter(Boolean) as string[]

  const { data: sceneThumbRows } =
    sceneIds.length > 0
      ? await supabase
          .from("asset_images")
          .select("entity_id, url")
          .eq("entity_type", "scene")
          .eq("role", "avatar")
          .eq("variant", "sm")
          .in("entity_id", sceneIds)
      : { data: null }

  const thumbBySceneId = new Map<string, string>()
  for (const r of sceneThumbRows ?? []) {
    if (r.entity_id && r.url) thumbBySceneId.set(r.entity_id as string, r.url as string)
  }

  return rows.map((raw) => {
    const r = raw as {
      id: string
      fiction_id: string
      title: string
      description: string
      quote: string | null
      video_url: string
    }
    const loc = locationFromSceneJoinRow(raw)
    const poster = thumbBySceneId.get(r.id) ?? ""
    return {
      id: r.id,
      name: r.title?.trim() || loc?.name || "Scene",
      address: loc?.formatted_address ?? "",
      lat: loc?.latitude ?? 0,
      lng: loc?.longitude ?? 0,
      cityId: loc?.city_id ?? "",
      fictionId: r.fiction_id ?? "",
      image: poster,
      videoUrl: String(r.video_url).trim(),
      description: r.description ?? "",
      sceneDescription: r.description ?? "",
      sceneQuote: r.quote ?? undefined,
      visitTip: undefined,
    }
  })
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

  async countByFictionIds(fictionIds: string[]): Promise<Record<string, number>> {
    if (fictionIds.length === 0) return {}
    const supabase = createAnonymousClient()
    const { data, error } = await supabase
      .from("scenes")
      .select("fiction_id")
      .in("fiction_id", fictionIds)
      .eq("active", true)
    if (error) {
      console.error("[scenes repo] countByFictionIds:", error.message)
      return {}
    }
    const counts: Record<string, number> = {}
    for (const id of fictionIds) counts[id] = 0
    for (const r of data ?? []) {
      const id = (r as { fiction_id?: string }).fiction_id
      if (id) counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  },

  async listCitiesWithActiveScenes(fictionIds: string[] | null): Promise<City[]> {
    const supabase = createAnonymousClient()

    let sceneQuery = supabase
      .from("scenes")
      .select(
        `
        id,
        places!inner (
          locations!inner (
            city_id
          )
        )
      `,
      )
      .eq("active", true)
      .not("video_url", "is", null)

    if (fictionIds && fictionIds.length > 0) {
      sceneQuery = sceneQuery.in("fiction_id", fictionIds)
    }

    const { data: sceneRows, error } = await sceneQuery

    if (error) {
      console.error("[scenes repo] listCitiesWithActiveScenes:", error.message)
      return []
    }

    const cityIds = new Set<string>()
    for (const row of sceneRows ?? []) {
      const placesRaw = (row as { places?: unknown }).places
      const placeObj = Array.isArray(placesRaw) ? placesRaw[0] : placesRaw
      const locRaw =
        placeObj && typeof placeObj === "object" && "locations" in placeObj
          ? (placeObj as { locations?: unknown }).locations
          : undefined
      const locObj = Array.isArray(locRaw) ? locRaw[0] : locRaw
      const cid =
        locObj && typeof locObj === "object" && "city_id" in locObj
          ? (locObj as { city_id?: string }).city_id
          : undefined
      if (cid) cityIds.add(cid)
    }

    if (cityIds.size === 0) return []

    const { data: cities, error: citiesError } = await supabase
      .from("cities")
      .select("*")
      .in("id", [...cityIds])
      .order("name", { ascending: true })

    if (citiesError) {
      console.error("[scenes repo] listCitiesWithActiveScenes cities:", citiesError.message)
      return []
    }

    return (cities ?? []) as City[]
  },

  async listFictionIdsWithScenesInCity(cityId: string): Promise<string[]> {
    const supabase = createAnonymousClient()

    const { data: locationRows, error: locError } = await supabase
      .from("locations")
      .select("id")
      .eq("city_id", cityId)

    if (locError) {
      console.error("[scenes repo] listFictionIdsWithScenesInCity locations:", locError.message)
      return []
    }

    const locationIds = (locationRows ?? []).map((r) => r.id).filter(Boolean)
    if (locationIds.length === 0) return []

    const { data: placeRows, error: placeError } = await supabase
      .from("places")
      .select("id")
      .in("location_id", locationIds)

    if (placeError) {
      console.error("[scenes repo] listFictionIdsWithScenesInCity places:", placeError.message)
      return []
    }

    const placeIds = (placeRows ?? []).map((r) => r.id as string).filter(Boolean)
    if (placeIds.length === 0) return []

    const { data: sceneRows, error: sceneError } = await supabase
      .from("scenes")
      .select("fiction_id")
      .in("place_id", placeIds)
      .eq("active", true)
      .not("video_url", "is", null)

    if (sceneError) {
      console.error("[scenes repo] listFictionIdsWithScenesInCity scenes:", sceneError.message)
      return []
    }

    const ids = new Set<string>()
    for (const r of sceneRows ?? []) {
      const fid = (r as { fiction_id?: string }).fiction_id
      if (fid) ids.add(fid)
    }
    return [...ids].sort()
  },

  async listScenesWithVideoInBbox(params: { fictionIds: string[]; bbox: MapBbox }): Promise<Location[]> {
    const { fictionIds, bbox } = params
    if (fictionIds.length === 0) return []

    const supabase = createAnonymousClient()

    const { data: locationRows, error: locError } = await supabase
      .from("locations")
      .select("id")
      .gte("latitude", bbox.south)
      .lte("latitude", bbox.north)
      .gte("longitude", bbox.west)
      .lte("longitude", bbox.east)

    if (locError) {
      console.error("[scenes repo] listScenesWithVideoInBbox locations:", locError.message)
      return []
    }

    const locationIds = (locationRows ?? []).map((r) => r.id).filter(Boolean)
    if (locationIds.length === 0) return []

    const { data: placeRows, error: placeError } = await supabase
      .from("places")
      .select("id")
      .in("fiction_id", fictionIds)
      .in("location_id", locationIds)

    if (placeError) {
      console.error("[scenes repo] listScenesWithVideoInBbox places:", placeError.message)
      return []
    }

    const placeIds = (placeRows ?? []).map((r) => r.id as string).filter(Boolean)
    if (placeIds.length === 0) return []

    return fetchScenesWithVideoForPlaceIds(supabase, fictionIds, placeIds)
  },

  async listScenesWithVideoInCity(params: {
    fictionIds: string[]
    cityId: string
  }): Promise<Location[]> {
    const { fictionIds, cityId } = params
    if (fictionIds.length === 0) return []

    const supabase = createAnonymousClient()

    const { data: locationRows, error: locError } = await supabase
      .from("locations")
      .select("id")
      .eq("city_id", cityId)

    if (locError) {
      console.error("[scenes repo] listScenesWithVideoInCity locations:", locError.message)
      return []
    }

    const locationIds = (locationRows ?? []).map((r) => r.id).filter(Boolean)
    if (locationIds.length === 0) return []

    const { data: placeRows, error: placeError } = await supabase
      .from("places")
      .select("id")
      .in("fiction_id", fictionIds)
      .in("location_id", locationIds)

    if (placeError) {
      console.error("[scenes repo] listScenesWithVideoInCity places:", placeError.message)
      return []
    }

    const placeIds = (placeRows ?? []).map((r) => r.id as string).filter(Boolean)
    if (placeIds.length === 0) return []

    return fetchScenesWithVideoForPlaceIds(supabase, fictionIds, placeIds)
  },

  async getScenesCreatedByUserId(userId: string): Promise<ProfileScenePreview[]> {
    try {
      const supabase = await createClient()
      const { data: scenes, error } = await supabase
        .from("scenes")
        .select("id, title, place_id, fiction_id, fictions ( title )")
        .eq("active", true)
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error || !scenes?.length) return []

      const sceneIds = scenes.map((s) => s.id)
      const { data: imgs } = await supabase
        .from("asset_images")
        .select("entity_id, role, variant, url")
        .eq("entity_type", "scene")
        .in("entity_id", sceneIds)

      const byScene = new Map<string, ImgRow[]>()
      for (const row of imgs ?? []) {
        const r = row as ImgRow
        const list = byScene.get(r.entity_id) ?? []
        list.push(r)
        byScene.set(r.entity_id, list)
      }

      return scenes.flatMap((s) => {
        const fictions = (s as { fictions?: unknown }).fictions
        const fictionTitle =
          fictions && typeof fictions === "object" && "title" in fictions
            ? String((fictions as { title?: string }).title ?? "")
            : ""
        const placeId = (s as { place_id?: string }).place_id
        const fictionId = (s as { fiction_id?: string }).fiction_id
        if (!placeId || !fictionId) return []
        return [
          {
            id: s.id,
            fictionId,
            placeId,
            title: s.title,
            fictionTitle,
            imageUrl: pickThumb(byScene.get(s.id) ?? []),
          },
        ]
      })
    } catch {
      return []
    }
  },
}
