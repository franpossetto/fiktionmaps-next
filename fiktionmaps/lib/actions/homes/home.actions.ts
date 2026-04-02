"use server"

import { cache } from "react"
import { getMyHomes, addHome, deleteHome } from "@/lib/server"
import type { UserHome, CreateHomeData } from "@/src/homes"

export type HomesResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

async function fetchUserHomesAction(): Promise<HomesResult<UserHome[]>> {
  try {
    const homes = await getMyHomes()
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

export async function addHomeAction(
  data: CreateHomeData,
): Promise<HomesResult<UserHome>> {
  try {
    const home = await addHome(data)
    if (!home) return { data: null, error: "Failed to add home" }
    return { data: home, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to add home",
    }
  }
}

export async function deleteHomeAction(
  homeId: string,
): Promise<HomesResult<true>> {
  try {
    const ok = await deleteHome(homeId)
    if (!ok) return { data: null, error: "Failed to delete home" }
    return { data: true, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to delete home",
    }
  }
}
