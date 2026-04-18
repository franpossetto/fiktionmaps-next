"use server"

import { updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { zodErrorMessage } from "@/lib/validation/http"
import { isUuidString, uuidSchema } from "@/lib/validation/primitives"
import type { MapBbox } from "@/lib/validation/map-query"
import { scenesSupabaseAdapter } from "@/src/scenes/infrastructure/supabase/scene.repository.impl"
import { fictionsRepoPublic } from "@/src/shared/infrastructure/supabase/anon-repos"
import { listScenesQuerySchema } from "@/src/scenes/infrastructure/next/scene.form-parsers"
import { createSceneBodySchema, patchSceneBodySchema } from "@/src/scenes/domain/scene.schemas"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Location } from "@/src/locations/domain/location.entity"
import { listScenesUseCase } from "@/src/scenes/application/list-scenes.usecase"
import { getSceneByIdUseCase } from "@/src/scenes/application/get-scene-by-id.usecase"
import { createSceneUseCase } from "@/src/scenes/application/create-scene.usecase"
import { updateSceneUseCase } from "@/src/scenes/application/update-scene.usecase"
import { deleteSceneUseCase } from "@/src/scenes/application/delete-scene.usecase"
import { listScenesInCityUseCase } from "@/src/scenes/application/list-scenes-in-city.usecase"
import { listScenesInBboxUseCase } from "@/src/scenes/application/list-scenes-in-bbox.usecase"
import { getCitiesWithScenesUseCase } from "@/src/scenes/application/get-cities-with-scenes.usecase"
import type { CreateSceneResult, UpdateSceneResult, DeleteSceneResult, ListScenesQueryInput } from "./scene.actions.types"
import { getCitiesWithScenesForViewer, getCityFictionsWithScenesForViewer } from "./scene.queries"

export type { CreateSceneResult, UpdateSceneResult, DeleteSceneResult, ListScenesQueryInput } from "./scene.actions.types"

const getFictionType = async (fictionId: string): Promise<string | null> => {
  const fiction = await fictionsRepoPublic.getById(fictionId)
  return fiction?.type ?? null
}

export async function listScenesAction(query: ListScenesQueryInput = {}): Promise<Scene[]> {
  const parsed = listScenesQuerySchema.safeParse({
    fictionId: query.fictionId ?? null,
    placeId: query.placeId ?? null,
    locationId: query.locationId ?? null,
    active: query.active ?? null,
  })
  if (!parsed.success) return []
  const { fictionId, placeId, locationId, active } = parsed.data
  return listScenesUseCase(
    {
      fictionId: fictionId || undefined,
      placeId: placeId || undefined,
      locationId: locationId || undefined,
      active,
    },
    scenesSupabaseAdapter,
  )
}

export async function getSceneByIdAction(sceneId: string): Promise<Scene | null> {
  if (!uuidSchema.safeParse(sceneId).success) return null
  return getSceneByIdUseCase(sceneId, scenesSupabaseAdapter)
}

export async function createSceneAction(body: unknown): Promise<CreateSceneResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const parsed = createSceneBodySchema.safeParse(body)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  try {
    const scene = await createSceneUseCase(parsed.data, user.id, {
      scenesRepo: scenesSupabaseAdapter,
      getFictionType,
    })
    updateTag("scenes")
    return { success: true, scene }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create scene" }
  }
}

export async function updateSceneAction(sceneId: string, body: unknown): Promise<UpdateSceneResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  if (!uuidSchema.safeParse(sceneId).success) return { success: false, error: "Invalid sceneId" }

  const parsed = patchSceneBodySchema.safeParse(body)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  try {
    const scene = await updateSceneUseCase(sceneId, parsed.data, {
      scenesRepo: scenesSupabaseAdapter,
      getFictionType,
    })
    if (!scene) return { success: false, error: "Not found" }
    updateTag("scenes")
    return { success: true, scene }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update scene" }
  }
}

export async function deleteSceneAction(sceneId: string): Promise<DeleteSceneResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  if (!uuidSchema.safeParse(sceneId).success) return { success: false, error: "Invalid sceneId" }

  const ok = await deleteSceneUseCase(sceneId, scenesSupabaseAdapter)
  if (!ok) return { success: false, error: "Failed to delete scene" }
  updateTag("scenes")
  return { success: true }
}

export async function getCitiesWithScenesForViewerAction(): Promise<City[]> {
  return getCitiesWithScenesForViewer()
}

export async function getCityFictionsWithScenesForViewerAction(cityId: string): Promise<FictionWithMedia[]> {
  if (!uuidSchema.safeParse(cityId).success) return []
  return getCityFictionsWithScenesForViewer(cityId)
}

export async function listScenesForViewerAction(
  fictionIds: string[],
  opts: { cityId: string } | { bbox: MapBbox },
): Promise<Location[]> {
  const ids = fictionIds.filter(isUuidString)
  if (ids.length === 0) return []

  if ("cityId" in opts && uuidSchema.safeParse(opts.cityId).success) {
    return listScenesInCityUseCase(ids, opts.cityId, scenesSupabaseAdapter)
  }

  if ("bbox" in opts) {
    const b = opts.bbox
    if (![b.west, b.south, b.east, b.north].every((n) => Number.isFinite(n))) return []
    return listScenesInBboxUseCase(ids, b, scenesSupabaseAdapter)
  }

  return []
}

export async function getCityHintsForScenesViewerAction(
  fictionIds: string[] | null,
): Promise<{ cities: Pick<City, "id" | "name" | "country">[] }> {
  const ids = fictionIds?.filter(isUuidString) ?? []
  const cities = await getCitiesWithScenesUseCase(ids.length > 0 ? ids : null, scenesSupabaseAdapter)
  return { cities }
}
