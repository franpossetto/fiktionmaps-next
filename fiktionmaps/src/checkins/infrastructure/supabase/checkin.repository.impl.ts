import { createClient } from "@/lib/supabase/server"
import type { CityCheckin, EnrichedPlaceCheckin, PlaceCheckin } from "@/src/checkins/domain/checkin.entity"
import type { CheckinsRepositoryPort } from "@/src/checkins/domain/checkin.repository"
import type { AssetImageRow } from "@/src/fictions/infrastructure/supabase/fiction.mappers"

function toCityCheckin(row: {
  id: string
  user_id: string
  city_id: string
  lat: number | null
  lng: number | null
  origin: string
  checked_at: string
}): CityCheckin {
  return {
    id: row.id,
    userId: row.user_id,
    cityId: row.city_id,
    lat: row.lat,
    lng: row.lng,
    origin: row.origin as CityCheckin["origin"],
    checkedAt: row.checked_at,
  }
}

function toPlaceCheckin(row: {
  id: string
  user_id: string
  place_id: string
  lat: number | null
  lng: number | null
  distance_m: number | null
  verified: boolean | null
  origin: string
  checked_at: string
}): PlaceCheckin {
  return {
    id: row.id,
    userId: row.user_id,
    placeId: row.place_id,
    lat: row.lat,
    lng: row.lng,
    distanceM: row.distance_m,
    verified: row.verified,
    origin: row.origin as PlaceCheckin["origin"],
    checkedAt: row.checked_at,
  }
}

export const checkinsSupabaseAdapter: CheckinsRepositoryPort = {
  async getCityCheckins(userId: string): Promise<CityCheckin[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("city_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("checked_at", { ascending: false })
    if (error || !data) return []
    return data.map(toCityCheckin)
  },

  async getPlaceCheckins(userId: string): Promise<PlaceCheckin[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("place_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("checked_at", { ascending: false })
    if (error || !data) return []
    return data.map(toPlaceCheckin)
  },

  async createCityCheckin(
    userId: string,
    cityId: string,
    lat: number | null,
    lng: number | null,
    origin: "auto" | "manual",
  ): Promise<CityCheckin | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("city_checkins")
      .insert({ user_id: userId, city_id: cityId, lat, lng, origin })
      .select()
      .single()
    if (error || !data) return null
    return toCityCheckin(data)
  },

  async createPlaceCheckin(
    userId: string,
    placeId: string,
    lat: number | null,
    lng: number | null,
    distanceM: number,
    verified: boolean,
    origin: "gps" | "manual",
  ): Promise<PlaceCheckin | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("place_checkins")
      .insert({
        user_id: userId,
        place_id: placeId,
        lat,
        lng,
        distance_m: Math.round(distanceM),
        verified,
        origin,
      })
      .select()
      .single()
    if (error || !data) return null
    return toPlaceCheckin(data)
  },

  async hasCheckedInCity(userId: string, cityId: string): Promise<boolean> {
    const supabase = await createClient()
    const { count } = await supabase
      .from("city_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("city_id", cityId)
    return (count ?? 0) > 0
  },

  async getPlaceLocation(placeId: string): Promise<{ lat: number; lng: number; cityId: string } | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("places")
      .select("location_id, locations(latitude, longitude, city_id)")
      .eq("id", placeId)
      .single()
    if (error || !data) return null
    const loc = data.locations as unknown as { latitude: number; longitude: number; city_id: string } | null
    if (!loc) return null
    return { lat: loc.latitude, lng: loc.longitude, cityId: loc.city_id }
  },

  async getEnrichedPlaceCheckinsForUser(userId: string): Promise<EnrichedPlaceCheckin[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("place_checkins")
      .select(
        `
          id,
          place_id,
          verified,
          distance_m,
          checked_at,
          places!inner (
            id,
            fiction_id,
            fictions!inner ( id, title ),
            location_id,
            locations!inner ( name, formatted_address, city_id )
          )
        `,
      )
      .eq("user_id", userId)
      .order("checked_at", { ascending: false })

    if (error) throw new Error(error.message)

    const rows = (data ?? []) as any[]
    const cityIds = [
      ...new Set(
        rows
          .map((row) => row.places?.locations?.city_id as string | undefined)
          .filter((id): id is string => !!id),
      ),
    ]
    const fictionIds = [
      ...new Set(
        rows
          .map((row) => row.places?.fiction_id as string | undefined)
          .filter((id): id is string => !!id),
      ),
    ]
    const placeIds = [
      ...new Set(rows.map((row) => row.place_id as string | undefined).filter((id): id is string => !!id)),
    ]

    const [citiesRes, imagesRes, placeImagesRes] = await Promise.all([
      cityIds.length
        ? supabase.from("cities").select("id, name, country").in("id", cityIds)
        : Promise.resolve({ data: [] as { id: string; name: string; country: string }[], error: null }),
      fictionIds.length
        ? supabase
            .from("asset_images")
            .select("entity_id, role, variant, url")
            .eq("entity_type", "fiction")
            .in("entity_id", fictionIds)
        : Promise.resolve({ data: [] as AssetImageRow[], error: null }),
      placeIds.length
        ? supabase
            .from("asset_images")
            .select("entity_id, url")
            .eq("entity_type", "place")
            .eq("role", "avatar")
            .eq("variant", "sm")
            .in("entity_id", placeIds)
        : Promise.resolve({ data: [] as { entity_id: string; url: string }[], error: null }),
    ])

    const cityById = new Map((citiesRes.data ?? []).map((c) => [c.id, c]))
    const coverByFiction = new Map<string, string | null>()
    for (const fid of fictionIds) coverByFiction.set(fid, null)
    for (const row of imagesRes.data ?? []) {
      const r = row as AssetImageRow
      if (r.role === "cover" && r.variant === "sm") coverByFiction.set(r.entity_id, r.url)
    }
    const placeImageById = new Map<string, string>()
    for (const row of placeImagesRes.data ?? []) {
      const r = row as { entity_id: string; url: string }
      if (r.entity_id && r.url) placeImageById.set(r.entity_id, r.url)
    }

    return rows.map((row: any) => {
      const place = row.places
      const fiction = place?.fictions
      const location = place?.locations
      const cid = location?.city_id as string | undefined
      const city = cid ? cityById.get(cid) : undefined
      const fid = place?.fiction_id as string | undefined
      return {
        id: row.id,
        placeId: row.place_id,
        placeName: location?.name ?? "Unknown place",
        placeAddress: location?.formatted_address ?? "",
        placeImage: placeImageById.get(row.place_id) ?? null,
        fictionId: place?.fiction_id ?? "",
        fictionTitle: fiction?.title ?? "",
        fictionCover: fid ? coverByFiction.get(fid) ?? null : null,
        cityId: cid ?? null,
        cityName: city?.name ?? null,
        verified: row.verified,
        distanceM: row.distance_m,
        checkedAt: row.checked_at,
      }
    })
  },
}
