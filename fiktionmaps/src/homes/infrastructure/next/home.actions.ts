"use server"

import { cache } from "react"
import { updateTag } from "next/cache"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { createClient } from "@/lib/supabase/server"
import { createHomesSupabaseAdapter } from "@/src/homes/infrastructure/supabase/home.repository.impl"
import { addHomeUseCase } from "@/src/homes/application/add-home.usecase"
import { getHomesByUserIdCached } from "./home.queries"
import type { UserHome, CreateHomeData } from "@/src/homes/domain/home.entity"

function getRepo() {
  return createHomesSupabaseAdapter(createClient)
}

export type HomesResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

async function fetchUserHomesAction(): Promise<HomesResult<UserHome[]>> {
  try {
    const userId = await getSessionUserId()
    if (!userId) return { data: [], error: null }
    const homes = await getHomesByUserIdCached(userId)
    return { data: homes, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to load homes",
    }
  }
}
/** Request-scoped dedupe for profile homes reads. */
export const getUserHomesAction = cache(fetchUserHomesAction)

export async function addHomeAction(data: CreateHomeData): Promise<HomesResult<UserHome>> {
  try {
    const userId = await getSessionUserId()
    if (!userId) return { data: null, error: "Not authenticated" }
    const home = await addHomeUseCase(userId, data, getRepo())
    if (!home) return { data: null, error: "Failed to add home" }
    updateTag(`user-homes-${userId}`)
    return { data: home, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to add home",
    }
  }
}

export async function deleteHomeAction(homeId: string): Promise<HomesResult<true>> {
  try {
    const userId = await getSessionUserId()
    const ok = await getRepo().delete(homeId)
    if (!ok) return { data: null, error: "Failed to delete home" }
    if (userId) updateTag(`user-homes-${userId}`)
    return { data: true, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to delete home",
    }
  }
}
