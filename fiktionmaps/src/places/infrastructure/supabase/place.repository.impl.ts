import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import { ASSET_IMAGES_BUCKET } from "@/lib/asset-images/variant-sizes"
import type { MapBbox } from "@/lib/validation/map-query"
import type { Place } from "@/src/places/domain/place.entity"
import type { CreatePlaceData, UpdatePlaceData } from "@/src/places/domain/place.schemas"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

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

/** Embed column may appear as `location`, `locations`, object or single-element array. */
function parseLocationEmbedFromPlaceRow(row: Record<string, unknown>): Record<string, unknown> | null {
  const rawLoc = row.location ?? row.locations
  const locRow = Array.isArray(rawLoc) ? rawLoc[0] : rawLoc
  if (locRow && typeof locRow === "object" && !Array.isArray(locRow)) {
    return locRow as Record<string, unknown>
  }
  return null
}

function mapPlaceRowsToPlaces(
  placeRows: Record<string, unknown>[],
  avatarByPlaceId: Map<string, string>
): Place[] {
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

    const geoName = loc ? str(loc, "name", "name") || "Unknown place" : "Unknown place"
    const address = loc ? str(loc, "formatted_address", "formattedAddress") : ""
    const lat = loc ? num(loc, "latitude", "latitude") : 0
    const lng = loc ? num(loc, "longitude", "longitude") : 0
    const cityId = loc ? str(loc, "city_id", "cityId") : ""
    const locationType = loc ? optStr(loc, "type", "type") : null
    const isLandmark = loc ? Boolean(loc.is_landmark ?? loc.isLandmark) : false

    return {
      id: placeId,
      placeId,
      name: optStr(p, "name", "name"),
      fictionId,
      location: {
        name: geoName,
        address,
        lat,
        lng,
        cityId,
        locationType,
        isLandmark,
      },
      image: avatarByPlaceId.get(placeId) ?? "/placeholder.svg",
      videoUrl: "",
      description,
      sceneDescription: "",
      sceneQuote: undefined,
      visitTip: undefined,
    }
  })
}

export function createPlacesSupabaseAdapter(
  getSupabase: () => Promise<SupabaseClient<Database>>
): PlacesRepositoryPort {
  return {
    listAllPlaces: cache(async (): Promise<Place[]> => {
      const supabase = await getSupabase()
      const { data: placeRows, error: placesError } = await supabase
        .from("places")
        .select(
          "id, fiction_id, description, active, location_id, name, locations(id, name, formatted_address, latitude, longitude, city_id, is_landmark)"
        )
        .order("created_at", { ascending: false })
        .range(0, 9999)

      if (placesError) {
        console.error("[places repo] listAllPlaces query error:", placesError.message)
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

      return mapPlaceRowsToPlaces(places, avatarByPlaceId)
    }),

    getCountsByFictionIds: cache(async (fictionIds: string[]): Promise<Record<string, number>> => {
      if (fictionIds.length === 0) return {}
      const supabase = await getSupabase()
      const counts: Record<string, number> = {}

      const pageSize = 1000
      for (let from = 0; ; from += pageSize) {
        const to = from + pageSize - 1
        const { data, error } = await supabase
          .from("places")
          .select("fiction_id")
          .in("fiction_id", fictionIds)
          .eq("active", true)
          .range(from, to)

        if (error || !data) return {}

        for (const row of data) {
          const fictionId = row.fiction_id
          if (!fictionId) continue
          counts[fictionId] = (counts[fictionId] ?? 0) + 1
        }

        if (data.length < pageSize) break
      }

      return counts
    }),

    getByFictionId: cache(async (fictionId: string): Promise<Place[]> => {
      const supabase = await getSupabase()
      const { data: placeRows, error } = await supabase
        .from("places")
        .select(
          "id, fiction_id, description, active, location_id, name, locations(id, name, formatted_address, latitude, longitude, city_id, is_landmark)"
        )
        .eq("fiction_id", fictionId)
        .order("created_at", { ascending: false })

      if (error || !placeRows) return []
      const places = placeRows as Record<string, unknown>[]
      const placeIds = places.map((p) => p.id as string).filter(Boolean)

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
      return mapPlaceRowsToPlaces(places, avatarByPlaceId)
    }),

    getByCityId: cache(async (cityId: string): Promise<Place[]> => {
      const supabase = await getSupabase()
      const { data: locRows } = await supabase
        .from("locations")
        .select("id")
        .eq("city_id", cityId)

      const locationIds = (locRows ?? []).map((r) => r.id).filter(Boolean)
      if (locationIds.length === 0) return []

      const { data: placeRows, error } = await supabase
        .from("places")
        .select(
          "id, fiction_id, description, active, location_id, name, locations(id, name, formatted_address, latitude, longitude, city_id, is_landmark)"
        )
        .in("location_id", locationIds)
        .order("created_at", { ascending: false })

      if (error || !placeRows) return []
      const places = placeRows as Record<string, unknown>[]
      const placeIds = places.map((p) => p.id as string).filter(Boolean)

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
      return mapPlaceRowsToPlaces(places, avatarByPlaceId)
    }),

    getFictionIdsByCityId: cache(async (cityId: string): Promise<string[]> => {
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
    }),

    getById: cache(async (placeId: string, avatarVariant: "sm" | "lg" = "sm"): Promise<Place | null> => {
      const supabase = await getSupabase()
      const { data: row, error } = await supabase
        .from("places")
        .select(
          `id, fiction_id, description, active, name,
           location:locations!inner (
             id, name, formatted_address, latitude, longitude, city_id, is_landmark
           )`
        )
        .eq("id", placeId)
        .maybeSingle()

      if (error || !row) return null

      const loc = parseLocationEmbedFromPlaceRow(row as Record<string, unknown>)

      const fetchAvatarUrl = async (variant: "sm" | "lg"): Promise<string | null> => {
        const { data: avatarRows } = await supabase
          .from("asset_images")
          .select("url")
          .eq("entity_type", "place")
          .eq("role", "avatar")
          .eq("variant", variant)
          .eq("entity_id", placeId)
          .limit(1)
        const url = (avatarRows?.[0] as { url?: string } | undefined)?.url?.trim()
        return url || null
      }

      let imageUrl = await fetchAvatarUrl(avatarVariant)
      if (!imageUrl && avatarVariant === "lg") {
        imageUrl = await fetchAvatarUrl("sm")
      }

      const pid = row.id as string

      return {
        id: pid,
        placeId: pid,
        name: optStr(row as Record<string, unknown>, "name", "name"),
        fictionId: row.fiction_id as string,
        location: {
          name: loc ? str(loc, "name", "name") || "Unknown place" : "Unknown place",
          address: loc ? str(loc, "formatted_address", "formattedAddress") : "",
          lat: loc ? num(loc, "latitude", "latitude") : 0,
          lng: loc ? num(loc, "longitude", "longitude") : 0,
          cityId: loc ? str(loc, "city_id", "cityId") : "",
          locationType: loc ? optStr(loc, "type", "type") : null,
          isLandmark: loc ? Boolean(loc.is_landmark ?? loc.isLandmark) : false,
        },
        image: imageUrl ?? "/placeholder.svg",
        videoUrl: "",
        description: (row.description as string | null) ?? "",
        sceneDescription: "",
        sceneQuote: undefined,
        visitTip: undefined,
      }
    }),

    async getByBboxAndFictionIds(fictionIds: string[], bbox: MapBbox): Promise<Place[]> {
      if (fictionIds.length === 0) return []
      const supabase = await getSupabase()
      const { data: rows, error } = await supabase
        .from("places")
        .select(
          `id, fiction_id, description, active, name,
           location:locations!inner (
             id, name, formatted_address, latitude, longitude, city_id, is_landmark
           )`
        )
        .in("fiction_id", fictionIds)
        .gte("locations.latitude", bbox.south)
        .lte("locations.latitude", bbox.north)
        .gte("locations.longitude", bbox.west)
        .lte("locations.longitude", bbox.east)

      if (error) {
        console.error("[places repo] getByBboxAndFictionIds:", error.message)
        return []
      }

      const placeIds = (rows ?? []).map((r) => r.id as string)
      if (placeIds.length === 0) return []
      const { data: avatarRows } = await supabase
        .from("asset_images")
        .select("entity_id, url")
        .eq("entity_type", "place")
        .eq("role", "avatar")
        .eq("variant", "sm")
        .in("entity_id", placeIds)

      const avatarByPlaceId = new Map<string, string>()
      for (const r of avatarRows ?? []) {
        if (r.entity_id && r.url) avatarByPlaceId.set(r.entity_id as string, r.url as string)
      }

      return (rows ?? []).map((r) => {
        const rRec = r as Record<string, unknown>
        const loc = parseLocationEmbedFromPlaceRow(rRec)
        const pid = r.id as string
        return {
          id: pid,
          placeId: pid,
          name: optStr(rRec, "name", "name"),
          fictionId: (r.fiction_id as string) ?? "",
          location: {
            name: loc ? str(loc, "name", "name") || "Unknown place" : "Unknown place",
            address: loc ? str(loc, "formatted_address", "formattedAddress") : "",
            lat: loc ? num(loc, "latitude", "latitude") : 0,
            lng: loc ? num(loc, "longitude", "longitude") : 0,
            cityId: loc ? str(loc, "city_id", "cityId") : "",
            locationType: loc ? optStr(loc, "type", "type") : null,
            isLandmark: loc ? Boolean(loc.is_landmark ?? loc.isLandmark) : false,
          },
          image: avatarByPlaceId.get(pid) ?? "/placeholder.svg",
          videoUrl: "",
          description: (r.description as string | null) ?? "",
          sceneDescription: "",
          sceneQuote: undefined,
          visitTip: undefined,
        }
      })
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
          name: data.name.trim(),
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

    async delete(placeId: string): Promise<boolean> {
      const supabase = await getSupabase()

      const { data: assetRows } = await supabase
        .from("asset_images")
        .select("url")
        .eq("entity_type", "place")
        .eq("entity_id", placeId)

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
          .eq("entity_type", "place")
          .eq("entity_id", placeId)
      }

      const { data, error } = await supabase
        .from("places")
        .delete()
        .eq("id", placeId)
        .select("id")
      if (error) return false
      return Array.isArray(data) && data.length === 1
    },
  }
}

export const supabaseRepositoryAdapter = createPlacesSupabaseAdapter(createClient)
