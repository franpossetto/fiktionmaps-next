"use server"

import { revalidatePath, updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { MODERATOR_ROLES } from "@/src/contributions/domain/contribution.config"
import { ensureUserIsModeratorUseCase } from "@/src/contributions/application/ensure-user-is-moderator.usecase"
import { profilesReaderSupabaseAdapter } from "@/src/contributions/infrastructure/supabase/profiles-reader.supabase"
import { resolveEntityContributionInsertDefaults } from "@/src/contributions/application/resolve-entity-contribution-insert-defaults.usecase"
import { zodErrorMessage } from "@/lib/validation/http"
import { isUuidString, uuidSchema } from "@/lib/validation/primitives"
import { scenesSupabaseAdapter } from "@/src/scenes/infrastructure/supabase/scene.repository.impl"
import { fictionsRepoPublic } from "@/src/shared/infrastructure/supabase/anon-repos"
import { listScenesQuerySchema, parseSceneContributeFormData } from "@/src/scenes/infrastructure/next/scene.form-parsers"
import { getFictionByIdCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getPlaceLocationByIdCached } from "@/src/places/infrastructure/next/place.queries"
import { supabaseRepositoryAdapter as placesRepo } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { supabaseRepositoryAdapter as contributionsRepo } from "@/src/contributions/infrastructure/supabase/contribution.repository.impl"
import {
  createSceneBodySchema,
  linkScenePlaceBodySchema,
  patchSceneBodySchema,
} from "@/src/scenes/domain/scene.schemas"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { listScenesUseCase } from "@/src/scenes/application/list-scenes.usecase"
import { getSceneByIdUseCase } from "@/src/scenes/application/get-scene-by-id.usecase"
import { createSceneUseCase } from "@/src/scenes/application/create-scene.usecase"
import { createContributorSceneUseCase } from "@/src/scenes/application/create-contributor-scene.usecase"
import { updateSceneUseCase } from "@/src/scenes/application/update-scene.usecase"
import { deleteSceneUseCase } from "@/src/scenes/application/delete-scene.usecase"
import { linkScenePlaceUseCase } from "@/src/scenes/application/link-scene-place.usecase"
import { listScenesInCityUseCase } from "@/src/scenes/application/list-scenes-in-city.usecase"
import { getCitiesWithScenesUseCase } from "@/src/scenes/application/get-cities-with-scenes.usecase"
import type {
  CreateSceneResult,
  UpdateSceneResult,
  DeleteSceneResult,
  LinkScenePlaceResult,
  ListScenesQueryInput,
  CreateContributorSceneResult,
} from "./scene.actions.types"
import {
  getCitiesWithScenesForViewer,
  getCityFictionsWithScenesForViewer,
  getFictionScenesForContributeCached,
} from "./scene.queries"

export type {
  CreateSceneResult,
  UpdateSceneResult,
  DeleteSceneResult,
  LinkScenePlaceResult,
  ListScenesQueryInput,
  CreateContributorSceneResult,
} from "./scene.actions.types"

const getFictionType = async (fictionId: string): Promise<string | null> => {
  const fiction = await fictionsRepoPublic.getById(fictionId)
  return fiction?.type ?? null
}

export async function listScenesAction(query: ListScenesQueryInput = {}): Promise<Scene[]> {
  const parsed = listScenesQuerySchema.safeParse({
    fictionId: query.fictionId ?? null,
    placeId: query.placeId ?? null,
    active: query.active ?? null,
  })
  if (!parsed.success) return []
  const { fictionId, placeId, active } = parsed.data
  return listScenesUseCase(
    {
      fictionId: fictionId || undefined,
      placeId: placeId || undefined,
      active,
    },
    scenesSupabaseAdapter,
  )
}

/** Approved+active scenes for contribute pickers (anon cache, light select). */
export async function listFictionScenesForContributeAction(fictionId: string): Promise<Scene[]> {
  if (!uuidSchema.safeParse(fictionId).success) return []
  return getFictionScenesForContributeCached(fictionId)
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
    const isStaffModerator = await ensureUserIsModeratorUseCase(
      user.id,
      profilesReaderSupabaseAdapter,
      MODERATOR_ROLES,
    )
    const { status } = resolveEntityContributionInsertDefaults(isStaffModerator, user.id)
    const scene = await createSceneUseCase(parsed.data, { userId: user.id, status }, {
      scenesRepo: scenesSupabaseAdapter,
      getFictionType,
    })
    // A newly created scene has no places yet (D5); places are linked separately via
    // linkScenePlaceAction, which invalidates the per-place tags.
    updateTag("scenes")
    updateTag("places")
    return { success: true, scene }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create scene" }
  }
}

export async function updateSceneAction(sceneId: string, body: unknown): Promise<UpdateSceneResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const isStaffModerator = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  if (!isStaffModerator) return { success: false, error: "Unauthorized" }

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
    updateTag(`scene-${sceneId}`)
    updateTag("places")
    // getScenesForPlaceCached is tagged `place-${placeId}`; scene fields (title, video, etc.)
    // are embedded there, so every place this scene is linked to must be invalidated too.
    for (const scenePlace of scene.places) updateTag(`place-${scenePlace.placeId}`)
    return { success: true, scene }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update scene" }
  }
}

export async function linkScenePlaceAction(body: unknown): Promise<LinkScenePlaceResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const parsed = linkScenePlaceBodySchema.safeParse(body)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  try {
    // Authorization mirrors the `scene_places` INSERT policy (staff, or the scene's own
    // `created_by`). `Scene` does not expose `created_by`, so non-staff attempts are left to
    // RLS as the backstop: a non-owner insert is rejected by Postgres and surfaces below.
    const scenePlace = await linkScenePlaceUseCase(parsed.data, { userId: user.id }, {
      scenesRepo: scenesSupabaseAdapter,
    })
    updateTag("scenes")
    updateTag("places")
    updateTag(`place-${parsed.data.placeId}`)
    return { success: true, scenePlace }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to link place" }
  }
}

export async function deleteSceneAction(sceneId: string): Promise<DeleteSceneResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const isStaffModerator = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  if (!isStaffModerator) return { success: false, error: "Unauthorized" }

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
  opts: { cityId: string },
): Promise<Place[]> {
  const ids = fictionIds.filter(isUuidString)
  if (ids.length === 0) return []
  if (!uuidSchema.safeParse(opts.cityId).success) return []
  return listScenesInCityUseCase(ids, opts.cityId, scenesSupabaseAdapter)
}

export async function getCityHintsForScenesViewerAction(
  fictionIds: string[] | null,
): Promise<{ cities: Pick<City, "id" | "name" | "country">[] }> {
  const ids = fictionIds?.filter(isUuidString) ?? []
  const cities = await getCitiesWithScenesUseCase(ids.length > 0 ? ids : null, scenesSupabaseAdapter)
  return { cities }
}

export async function createContributorSceneAction(
  formData: FormData,
): Promise<CreateContributorSceneResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = parseSceneContributeFormData(formData)
  if (!parsed.success) return { success: false, error: parsed.error }

  const isStaffModerator = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  const { status } = resolveEntityContributionInsertDefaults(isStaffModerator, user.id)

  const result = await createContributorSceneUseCase(
    {
      userId: user.id,
      status,
      autoApproveContribution: isStaffModerator,
      fictionId: parsed.data.fictionId,
      placeIds: parsed.data.placeIds,
      title: parsed.data.title,
      description: parsed.data.description,
      videoUrl: parsed.data.videoUrl,
      previewUrl: parsed.data.previewUrl,
      quote: parsed.data.quote ?? null,
      timestampLabel: parsed.data.timestampLabel ?? null,
      season: parsed.data.season ?? null,
      episode: parsed.data.episode ?? null,
      episodeTitle: parsed.data.episodeTitle ?? null,
    },
    {
      scenesRepo: scenesSupabaseAdapter,
      placesRepo,
      contributionsRepo,
      getFictionType,
    },
  )

  if (!result.success) return result

  revalidatePath("/admin")
  revalidatePath("/contributions")
  updateTag("scenes")
  updateTag("places")
  for (const placeId of result.placeIds) updateTag(`place-${placeId}`)
  updateTag("contributions")
  if (result.contributionAutoApproved) updateTag("profiles")

  const firstPlaceId = result.placeIds[0]!
  const [fiction, place] = await Promise.all([
    getFictionByIdCached(result.fictionId),
    getPlaceLocationByIdCached(firstPlaceId),
  ])

  const out: CreateContributorSceneResult = {
    success: true,
    sceneId: result.sceneId,
    fictionId: result.fictionId,
    fictionSlug: fiction?.slug ?? "",
    placeSlug: place?.slug ?? "",
  }
  if (typeof result.contributionAutoApproved === "boolean") {
    return { ...out, contributionAutoApproved: result.contributionAutoApproved }
  }
  return out
}
