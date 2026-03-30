import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/supabase/database.types"
import type { Location } from "@/src/locations"
import type { CreatePlaceData, UpdatePlaceData } from "./place.dtos"
import type { PlacesRepositoryPort } from "./place.repository.port"

function str(row: Record<string, unknown>, snake: string, camel: string): string {
  const v = row[snake] ?? row[camel]
  return typeof v === "string" ? v : ""
}

function num(row: Record<string, unknown>, snake: string, camel: string): number {
  const v = row[snake] ?? row[camel]
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function optStr(row: Record<string, unknown>, snake: string, camel: string): string | null {
  const v = row[snake] ?? row[camel]
  if (v == null || v === "") return null
  return typeof v === "string" ? v : null
}

function mapPlaceRowsToLocations(
  placeRows: Record<string, unknown>[],
  avatarByPlaceId: Map<string, string>
): Location[] {
  return placeRows.map((p) => {
    const placeId = (p.id as string) ?? ""
    const fictionId = (p.fiction_id ?? p.fictionId) as string
    const description = (p.description as string) ?? ""

    const raw = p.locations
    const locRow = Array.isArray(raw) ? raw[0] : raw
    const loc =
      locRow && typeof locRow === "object" && !Array.isArray(locRow)
        ? (locRow as Record<string, unknown>)
        : null

    const name = loc ? str(loc, "name", "name") || "Unknown place" : "Unknown place"
    const address = loc ? str(loc, "formatted_address", "formattedAddress") : ""
    const lat = loc ? num(loc, "latitude", "latitude") : 0
    const lng = loc ? num(loc, "longitude", "longitude") : 0
    const cityId = loc ? str(loc, "city_id", "cityId") : ""
    const locationType = loc ? optStr(loc, "type", "type") : null
    const isLandmark = loc ? Boolean(loc.is_landmark ?? loc.isLandmark) : false

    return {
      id: placeId,
      name,
      address,
      lat,
      lng,
      cityId,
      fictionId,
      image: avatarByPlaceId.get(placeId) ?? "/placeholder.svg",
      videoUrl: "",
      description,
      sceneDescription: "",
      sceneQuote: undefined,
      visitTip: undefined,
      locationType,
      isLandmark,
    }
  })
}

export function createPlacesSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): PlacesRepositoryPort {
  return {
    async listAllAsLocations(): Promise<Location[]> {
      const supabase = await getSupabase()
      const { data: placeRows, error: placesError } = await supabase
        .from("places")
        .select(
          "id, fiction_id, description, active, location_id, locations(id, name, formatted_address, latitude, longitude, city_id, is_landmark)"
        )
        .order("created_at", { ascending: false })
        .range(0, 9999)

      if (placesError) {
        console.error("[places repo] listAllAsLocations query error:", placesError.message)
        return []
      }

      const places = (placeRows ?? []) as Record<string, unknown>[]
      const placeIds = places.map((p) => (p.id as string)).filter(Boolean)

      const avatarByPlaceId = new Map<string, string>()
      if (placeIds.length > 0) {
        const { data: avatarRows } = await supabase
          .from("asset_images")
          .select("entity_id, url")
          .eq("entity_type", "place")
          .eq("role", "avatar")
          .eq("variant", "sm")
          .in("entity_id", placeIds)
        for (const r of avatarRows ?? []) {
          const row = r as Record<string, unknown>
          const eid = row.entity_id ?? row.entityId
          const url = row.url
          if (eid && url) avatarByPlaceId.set(String(eid), String(url))
        }
      }

      return mapPlaceRowsToLocations(places, avatarByPlaceId)
    },

    async getFictionIdsByCityId(cityId: string): Promise<string[]> {
      const supabase = await getSupabase()
      const { data: locationRows, error: locError } = await supabase
        .from("locations")
        .select("id")
        .eq("city_id", cityId)

      if (locError) return []
      const locationIds = (locationRows ?? []).map((r) => r.id).filter(Boolean)
      if (locationIds.length === 0) return []

      const { data: placeRows, error: placeError } = await supabase
        .from("places")
        .select("fiction_id")
        .in("location_id", locationIds)

      if (placeError) return []
      return [...new Set((placeRows ?? []).map((r) => r.fiction_id).filter(Boolean))]
    },

    async create(data: CreatePlaceData): Promise<{ placeId: string } | null> {
      const supabase = await getSupabase()

      const { data: locationRow, error: locationError } = await supabase
        .from("locations")
        .insert({
          city_id: data.cityId,
          name: data.name.trim(),
          formatted_address: data.formattedAddress?.trim() || data.name.trim(),
          post_code: null,
          latitude: data.latitude,
          longitude: data.longitude,
          external_id: null,
          provider: "mapbox",
          is_landmark: !!data.isLandmark,
        })
        .select("id")
        .single()

      if (locationError || !locationRow) {
        console.error("[places repo] create location failed:", locationError?.message)
        return null
      }

      const { data: placeRow, error: placeError } = await supabase
        .from("places")
        .insert({
          fiction_id: data.fictionId,
          location_id: locationRow.id,
          description: data.description.trim(),
          active: true,
        })
        .select("id")
        .single()

      if (placeError || !placeRow) {
        console.error("[places repo] create place failed:", placeError?.message)
        return null
      }

      return { placeId: placeRow.id }
    },

    async update(placeId: string, data: UpdatePlaceData): Promise<boolean> {
      const supabase = await getSupabase()

      const { data: placeRow, error: placeFetchError } = await supabase
        .from("places")
        .select("location_id")
        .eq("id", placeId)
        .single()

      if (placeFetchError || !placeRow?.location_id) return false

      const locationId = placeRow.location_id as string
      const locationUpdate: Record<string, unknown> = {
        name: data.name.trim(),
        formatted_address: data.formattedAddress?.trim() || data.name.trim(),
        latitude: data.latitude,
        longitude: data.longitude,
        city_id: data.cityId,
        is_landmark: !!data.isLandmark,
      }
      if (data.locationType !== undefined) {
        locationUpdate.type = data.locationType?.trim() || null
      }

      const { error: locationError } = await supabase
        .from("locations")
        .update(locationUpdate)
        .eq("id", locationId)

      if (locationError) return false

      const { error: placeError } = await supabase
        .from("places")
        .update({
          fiction_id: data.fictionId,
          description: data.description.trim(),
        })
        .eq("id", placeId)

      return !placeError
    },
  }
}

export const supabaseRepositoryAdapter = createPlacesSupabaseAdapter(createClient)
