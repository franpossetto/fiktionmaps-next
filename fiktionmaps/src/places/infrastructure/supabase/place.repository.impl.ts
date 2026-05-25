import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import { ASSET_IMAGES_BUCKET } from "@/lib/asset-images/variant-sizes"
import type { MapBbox } from "@/lib/validation/map-query"
import type { Place } from "@/src/places/domain/place.entity"
import type { CreatePlaceRepoInput, UpdatePlaceData } from "@/src/places/domain/place.schemas"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { SitemapPlaceEntry } from "@/src/places/domain/place-sitemap.entity"
import {
  type StreetViewReference,
  LOCATION_VIEW_REFERENCE_PROVIDER,
} from "@/src/locations/domain/location-view-reference.schemas"

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

function optNum(row: Record<string, unknown>, snake: string, camel: string): number | null {
  const v = row[snake] ?? row[camel]
  if (v == null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function mapStreetViewReferenceFromViewReferenceRow(
  row: Record<string, unknown>,
): StreetViewReference | null {
  const latitude = optNum(row, "camera_latitude", "cameraLatitude")
  const longitude = optNum(row, "camera_longitude", "cameraLongitude")
  const heading = optNum(row, "heading", "heading")
  const pitch = optNum(row, "pitch", "pitch")
  const fov = optNum(row, "fov", "fov")
  if (latitude == null || longitude == null || heading == null || pitch == null || fov == null) {
    return null
  }
  const panoId = optStr(row, "external_pano_id", "externalPanoId")
  return {
    latitude,
    longitude,
    heading,
    pitch,
    fov,
    panoId,
  }
}

function parseStreetViewReferenceFromLocationEmbed(
  loc: Record<string, unknown>,
): StreetViewReference | null {
  const raw = loc.location_view_references
  const row = Array.isArray(raw) ? raw[0] : raw
  if (!row || typeof row !== "object" || Array.isArray(row)) return null
  return mapStreetViewReferenceFromViewReferenceRow(row as Record<string, unknown>)
}

function viewReferenceToInsertRow(
  locationId: string,
  ref: StreetViewReference,
): Database["public"]["Tables"]["location_view_references"]["Insert"] {
  return {
    location_id: locationId,
    provider: LOCATION_VIEW_REFERENCE_PROVIDER.googleStreetView,
    camera_latitude: ref.latitude,
    camera_longitude: ref.longitude,
    heading: ref.heading,
    pitch: ref.pitch,
    fov: ref.fov,
    external_pano_id: ref.panoId?.trim() || null,
  }
}

async function upsertLocationViewReference(
  supabase: SupabaseClient<Database>,
  locationId: string,
  ref: StreetViewReference,
): Promise<boolean> {
  const { error } = await supabase
    .from("location_view_references")
    .upsert(viewReferenceToInsertRow(locationId, ref), { onConflict: "location_id" })
  if (error) {
    console.error("[places repo] upsert location_view_references failed:", error.message)
    return false
  }
  return true
}

async function deleteLocationViewReference(
  supabase: SupabaseClient<Database>,
  locationId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("location_view_references")
    .delete()
    .eq("location_id", locationId)
  if (error) {
    console.error("[places repo] delete location_view_references failed:", error.message)
    return false
  }
  return true
}

const LOCATION_EMBED_SELECT =
  "id, name, formatted_address, latitude, longitude, city_id, is_landmark, type, location_view_references(provider, camera_latitude, camera_longitude, heading, pitch, fov, external_pano_id)"

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
    const streetViewReference = loc ? parseStreetViewReferenceFromLocationEmbed(loc) : null

    const placeName = str(p, "name", "name") || "Place"
    const placeSlug = str(p, "slug", "slug") || placeId

    return {
      id: placeId,
      placeId,
      name: placeName,
      slug: placeSlug,
      fictionId,
      location: {
        name: geoName,
        address,
        lat,
        lng,
        cityId,
        locationType,
        isLandmark,
        streetViewReference,
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
  const port: PlacesRepositoryPort = {
    listAllPlaces: cache(async (): Promise<Place[]> => {
      const supabase = await getSupabase()
      const { data: placeRows, error: placesError } = await supabase
        .from("places")
        .select(
          `id, fiction_id, description, active, location_id, name, slug, locations(${LOCATION_EMBED_SELECT})`
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
          `id, fiction_id, description, active, location_id, name, slug, locations(${LOCATION_EMBED_SELECT})`
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
      const { data: placeRows, error } = await supabase
        .from("places")
        .select(
          `id, fiction_id, description, active, location_id, name, slug, locations!inner(${LOCATION_EMBED_SELECT})`
        )
        .eq("locations.city_id", cityId)
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
      const { data: rows, error } = await supabase
        .from("places")
        .select("fiction_id, locations!inner(id)")
        .eq("locations.city_id", cityId)

      if (error) return []
      return [...new Set((rows ?? []).map((r) => r.fiction_id).filter(Boolean))]
    }),

    listCityIdsWithPlaces: cache(async (): Promise<string[]> => {
      const supabase = await getSupabase()
      const ids = new Set<string>()
      const pageSize = 1000
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("places")
          .select("locations!inner(city_id)")
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1)

        if (error) {
          console.error("[places repo] listCityIdsWithPlaces:", error.message)
          break
        }
        if (!data?.length) break

        for (const row of data as Record<string, unknown>[]) {
          const rawLoc = row.locations
          const loc = Array.isArray(rawLoc) ? rawLoc[0] : rawLoc
          if (loc && typeof loc === "object" && loc !== null && "city_id" in loc) {
            const cid = (loc as { city_id?: string }).city_id
            if (typeof cid === "string" && cid) ids.add(cid)
          }
        }

        if (data.length < pageSize) break
      }

      return [...ids]
    }),

    getById: cache(async (placeId: string, avatarVariant: "sm" | "lg" = "sm"): Promise<Place | null> => {
      const supabase = await getSupabase()
      const { data: row, error } = await supabase
        .from("places")
        .select(
          `id, fiction_id, description, active, name, slug,
           location:locations!inner (
             ${LOCATION_EMBED_SELECT}
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

      const rowRec = row as Record<string, unknown>
      const placeName = str(rowRec, "name", "name") || "Place"
      const placeSlug = str(rowRec, "slug", "slug") || pid

      return {
        id: pid,
        placeId: pid,
        name: placeName,
        slug: placeSlug,
        fictionId: row.fiction_id as string,
        location: {
          name: loc ? str(loc, "name", "name") || "Unknown place" : "Unknown place",
          address: loc ? str(loc, "formatted_address", "formattedAddress") : "",
          lat: loc ? num(loc, "latitude", "latitude") : 0,
          lng: loc ? num(loc, "longitude", "longitude") : 0,
          cityId: loc ? str(loc, "city_id", "cityId") : "",
          locationType: loc ? optStr(loc, "type", "type") : null,
          isLandmark: loc ? Boolean(loc.is_landmark ?? loc.isLandmark) : false,
          streetViewReference: loc ? parseStreetViewReferenceFromLocationEmbed(loc) : null,
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
          `id, fiction_id, description, active, name, slug,
           location:locations!inner (
             ${LOCATION_EMBED_SELECT}
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
        const placeName = str(rRec, "name", "name") || "Place"
        const placeSlug = str(rRec, "slug", "slug") || pid

        return {
          id: pid,
          placeId: pid,
          name: placeName,
          slug: placeSlug,
          fictionId: (r.fiction_id as string) ?? "",
          location: {
            name: loc ? str(loc, "name", "name") || "Unknown place" : "Unknown place",
            address: loc ? str(loc, "formatted_address", "formattedAddress") : "",
            lat: loc ? num(loc, "latitude", "latitude") : 0,
            lng: loc ? num(loc, "longitude", "longitude") : 0,
            cityId: loc ? str(loc, "city_id", "cityId") : "",
            locationType: loc ? optStr(loc, "type", "type") : null,
            isLandmark: loc ? Boolean(loc.is_landmark ?? loc.isLandmark) : false,
            streetViewReference: loc ? parseStreetViewReferenceFromLocationEmbed(loc) : null,
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

    getByFictionIdAndSlug: cache(
      async (fictionId: string, slug: string, avatarVariant: "sm" | "lg" = "sm"): Promise<Place | null> => {
        const supabase = await getSupabase()
        const { data: row, error } = await supabase
          .from("places")
          .select(
            `id, fiction_id, description, active, name, slug,
             location:locations!inner (
               ${LOCATION_EMBED_SELECT}
             )`
          )
          .eq("fiction_id", fictionId)
          .eq("slug", slug.trim())
          .maybeSingle()

        if (error || !row) return null
        return port.getById(row.id as string, avatarVariant)
      },
    ),

    listSlugsByFictionId: cache(async (fictionId: string): Promise<string[]> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase.from("places").select("slug").eq("fiction_id", fictionId)
      if (error) return []
      return (data ?? []).map((r) => String(r.slug)).filter(Boolean)
    }),

    listActivePlacesForSitemap: cache(async (): Promise<SitemapPlaceEntry[]> => {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("places")
        .select("slug, updated_at, fictions!inner ( slug, active )")
        .eq("active", true)
        .eq("status", "approved")

      if (error || !data) return []

      return (data as Record<string, unknown>[])
        .map((row) => {
          const rawFiction = row.fictions
          const fiction = Array.isArray(rawFiction) ? rawFiction[0] : rawFiction
          if (!fiction || typeof fiction !== "object") return null
          const f = fiction as Record<string, unknown>
          if (!f.active) return null
          const fictionSlug = typeof f.slug === "string" ? f.slug.trim() : ""
          const placeSlug = typeof row.slug === "string" ? row.slug.trim() : ""
          if (!fictionSlug || !placeSlug) return null
          return {
            placeSlug,
            fictionSlug,
            updatedAt: String(row.updated_at ?? new Date().toISOString()),
          }
        })
        .filter((e): e is SitemapPlaceEntry => e != null)
    }),

    async create(data: CreatePlaceRepoInput): Promise<{ placeId: string; slug: string } | null> {
      const supabase = await getSupabase()

      const locationName = data.locationName.trim()
      const placeName = data.placeName.trim()

      const { data: locationRow, error: locationError } = await supabase
        .from("locations")
        .insert({
          city_id: data.cityId,
          name: locationName,
          formatted_address: data.formattedAddress?.trim() || locationName,
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

      const locationId = locationRow.id as string

      if (data.streetViewReference) {
        const viewOk = await upsertLocationViewReference(
          supabase,
          locationId,
          data.streetViewReference,
        )
        if (!viewOk) return null
      }

      const { data: placeRow, error: placeError } = await supabase
        .from("places")
        .insert({
          fiction_id: data.fictionId,
          location_id: locationId,
          name: placeName,
          slug: data.slug,
          description: data.description.trim(),
          active: data.status !== "pending",
          status: data.status,
          created_by: data.created_by,
        })
        .select("id, slug")
        .single()

      if (placeError || !placeRow) {
        console.error("[places repo] create place failed:", placeError?.message)
        return null
      }

      return {
        placeId: placeRow.id as string,
        slug: String(placeRow.slug),
      }
    },

    async update(placeId: string, data: UpdatePlaceData): Promise<boolean> {
      const supabase = await getSupabase()

      const { data: placeRow, error: placeFetchError } = await supabase
        .from("places")
        .select("location_id")
        .eq("id", placeId)
        .single()

      if (placeFetchError || !placeRow?.location_id) return false

      const locationName = data.locationName.trim()
      const placeName = data.placeName.trim()
      const locationId = placeRow.location_id as string
      const locationUpdate: Record<string, unknown> = {
        name: locationName,
        formatted_address: data.formattedAddress?.trim() || locationName,
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

      if (data.streetViewReference !== undefined) {
        if (data.streetViewReference) {
          const viewOk = await upsertLocationViewReference(
            supabase,
            locationId,
            data.streetViewReference,
          )
          if (!viewOk) return false
        } else {
          const viewOk = await deleteLocationViewReference(supabase, locationId)
          if (!viewOk) return false
        }
      }

      const { error: placeError } = await supabase
        .from("places")
        .update({
          fiction_id: data.fictionId,
          name: placeName,
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
  return port
}

export const supabaseRepositoryAdapter = createPlacesSupabaseAdapter(createClient)
