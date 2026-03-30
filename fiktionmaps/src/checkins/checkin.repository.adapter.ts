import { createClient } from "@/lib/supabase/server"
import type { CityCheckin, PlaceCheckin } from "./checkin.domain"
import type { CheckinsRepositoryPort } from "./checkin.repository.port"

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

  async hasCheckedInPlace(userId: string, placeId: string): Promise<boolean> {
    const supabase = await createClient()
    const { count } = await supabase
      .from("place_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("place_id", placeId)
    return (count ?? 0) > 0
  },

  async getPlaceLocation(placeId: string): Promise<{
    lat: number
    lng: number
    cityId: string
  } | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("places")
      .select("location_id, locations(latitude, longitude, city_id)")
      .eq("id", placeId)
      .single()
    if (error || !data) return null
    const loc = data.locations as unknown as {
      latitude: number
      longitude: number
      city_id: string
    } | null
    if (!loc) return null
    return { lat: loc.latitude, lng: loc.longitude, cityId: loc.city_id }
  },
}
