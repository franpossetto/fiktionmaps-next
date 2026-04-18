"use server"

import { cache } from "react"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { checkinsSupabaseAdapter } from "@/src/checkins/infrastructure/supabase/checkin.repository.impl"
import { checkinCityUseCase } from "@/src/checkins/application/checkin-city.usecase"
import { checkinPlaceUseCase } from "@/src/checkins/application/checkin-place.usecase"
import { listMyCityCheckinsUseCase } from "@/src/checkins/application/list-my-city-checkins.usecase"
import type { CityCheckin, EnrichedPlaceCheckin, PlaceCheckin } from "@/src/checkins/domain/checkin.entity"
import type { CheckinResult } from "./checkin.actions.types"
import { loadEnrichedPlaceCheckinsForCurrentUser } from "./checkin.queries"

export type { CheckinResult } from "./checkin.actions.types"
export type { CityCheckin, EnrichedPlaceCheckin, PlaceCheckin } from "@/src/checkins/domain/checkin.entity"

export async function checkinCityAction(
  cityId: string,
  lat: number | null,
  lng: number | null,
  origin: "auto" | "manual",
): Promise<CheckinResult<CityCheckin>> {
  const userId = await getSessionUserId()
  if (!userId) return { data: null, error: "Unauthorized" }
  try {
    const checkin = await checkinCityUseCase(userId, cityId, lat, lng, origin, checkinsSupabaseAdapter)
    if (!checkin) return { data: null, error: "Failed to check in to city" }
    return { data: checkin, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed to check in to city" }
  }
}

async function fetchUserCityCheckinsAction(): Promise<CheckinResult<CityCheckin[]>> {
  const userId = await getSessionUserId()
  if (!userId) return { data: null, error: "Unauthorized" }
  try {
    const checkins = await listMyCityCheckinsUseCase(userId, checkinsSupabaseAdapter)
    return { data: checkins, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed to load city checkins" }
  }
}

/** Request-scoped dedupe for profile checkins reads. */
export const getUserCityCheckinsAction = cache(fetchUserCityCheckinsAction)

async function fetchUserPlaceCheckinsEnrichedAction(): Promise<CheckinResult<EnrichedPlaceCheckin[]>> {
  try {
    const data = await loadEnrichedPlaceCheckinsForCurrentUser()
    return { data, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed to load enriched place checkins" }
  }
}

/** Request-scoped dedupe for profile sidebar/list reads. */
export const getUserPlaceCheckinsEnrichedAction = cache(fetchUserPlaceCheckinsEnrichedAction)
