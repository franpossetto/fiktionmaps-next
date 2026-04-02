"use server"

import { cache } from "react"
import {
  checkinCity,
  checkinPlace,
  getMyCityCheckins,
  getMyPlaceCheckins,
} from "@/lib/server"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { createClient } from "@/lib/supabase/server"
import type { CityCheckin, PlaceCheckin, PlaceCheckinResult } from "@/src/checkins"
import { mapAssetImagesToFiction, type AssetImageRow } from "@/src/fictions/fiction.mappers"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"

export interface EnrichedPlaceCheckin {
  id: string
  placeId: string
  placeName: string
  placeAddress: string
  /** `asset_images`: place / avatar / sm */
  placeImage: string | null
  fictionId: string
  fictionTitle: string
  fictionCover: string | null
  cityId: string | null
  cityName: string | null
  verified: boolean | null
  distanceM: number | null
  checkedAt: string
}

export type CheckinResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function checkinCityAction(
  cityId: string,
  lat: number | null,
  lng: number | null,
  origin: "auto" | "manual",
): Promise<CheckinResult<CityCheckin>> {
  try {
    const checkin = await checkinCity(cityId, lat, lng, origin)
    if (!checkin) return { data: null, error: "Failed to check in to city" }
    return { data: checkin, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to check in to city",
    }
  }
}

export async function checkinPlaceAction(
  placeId: string,
  lat: number,
  lng: number,
): Promise<CheckinResult<PlaceCheckinResult>> {
  try {
    const result = await checkinPlace(placeId, lat, lng)
    if (!result) return { data: null, error: "Failed to check in to place" }
    return { data: result, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to check in to place",
    }
  }
}

async function fetchUserCityCheckinsAction(): Promise<
  CheckinResult<CityCheckin[]>
> {
  try {
    const checkins = await getMyCityCheckins()
    return { data: checkins, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to load city checkins",
    }
  }
}
/** Request-scoped dedupe for profile checkins reads. */
export const getUserCityCheckinsAction = cache(fetchUserCityCheckinsAction)

async function fetchUserPlaceCheckinsAction(): Promise<
  CheckinResult<PlaceCheckin[]>
> {
  try {
    const checkins = await getMyPlaceCheckins()
    return { data: checkins, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to load place checkins",
    }
  }
}
/** Request-scoped dedupe for profile checkins reads. */
export const getUserPlaceCheckinsAction = cache(fetchUserPlaceCheckinsAction)

async function fetchUserPlaceCheckinsEnrichedAction(): Promise<
  CheckinResult<EnrichedPlaceCheckin[]>
> {
  try {
    const userId = await getSessionUserId()
    if (!userId) return { data: [], error: null }

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

    if (error) return { data: null, error: error.message }

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
    for (const fid of fictionIds) {
      coverByFiction.set(fid, null)
    }
    for (const row of imagesRes.data ?? []) {
      const r = row as AssetImageRow
      if (r.role === "cover" && r.variant === "sm") {
        coverByFiction.set(r.entity_id, r.url)
      }
    }

    const placeImageById = new Map<string, string>()
    for (const row of placeImagesRes.data ?? []) {
      const r = row as { entity_id: string; url: string }
      if (r.entity_id && r.url) placeImageById.set(r.entity_id, r.url)
    }

    const enriched: EnrichedPlaceCheckin[] = rows.map((row: any) => {
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

    return { data: enriched, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to load enriched place checkins",
    }
  }
}
/** Request-scoped dedupe for profile sidebar/list reads. */
export const getUserPlaceCheckinsEnrichedAction = cache(fetchUserPlaceCheckinsEnrichedAction)

async function fetchUserLikedFictionsAction(): Promise<CheckinResult<FictionWithMedia[]>> {
  try {
    const userId = await getSessionUserId()
    if (!userId) return { data: [], error: null }

    const supabase = await createClient()

    const { data: likes, error: likesError } = await supabase
      .from("fiction_likes")
      .select("fiction_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (likesError) return { data: null, error: likesError.message }
    if (!likes?.length) return { data: [], error: null }

    const fictionIds = likes.map((l) => l.fiction_id)

    const { data: fictionsData, error: fError } = await supabase
      .from("fictions")
      .select("*")
      .in("id", fictionIds)

    if (fError || !fictionsData?.length) return { data: [], error: null }

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

    // Preserve the order from fiction_likes (most recently added first)
    const orderedFictions = fictionIds
      .map((id) => fictionsData.find((f) => f.id === id))
      .filter(Boolean)
      .map((f) => mapAssetImagesToFiction(f!, imagesByEntity.get(f!.id) ?? []))

    return { data: orderedFictions, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to load liked fictions",
    }
  }
}
/** Request-scoped dedupe for repeated likes reads. */
export const getUserLikedFictionsAction = cache(fetchUserLikedFictionsAction)
