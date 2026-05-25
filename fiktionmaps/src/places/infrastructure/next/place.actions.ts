"use server"

import { revalidatePath, updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { MODERATOR_ROLES } from "@/src/contributions/domain/contribution.config"
import { ensureUserIsModeratorUseCase } from "@/src/contributions/application/ensure-user-is-moderator.usecase"
import { profilesReaderSupabaseAdapter } from "@/src/contributions/infrastructure/supabase/profiles-reader.supabase"
import { resolveEntityContributionInsertDefaults } from "@/src/contributions/application/resolve-entity-contribution-insert-defaults.usecase"
import { uuidSchema } from "@/lib/validation/primitives"
import type { MapBbox } from "@/lib/validation/map-query"
import { supabaseRepositoryAdapter as placesRepo } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { createPlaceUseCase } from "@/src/places/application/create-place.usecase"
import { updatePlaceUseCase } from "@/src/places/application/update-place.usecase"
import { deletePlaceUseCase } from "@/src/places/application/delete-place.usecase"
import { uploadEntityImage, validateImageFile } from "@/lib/asset-images/image-variant-service"
import {
  getAllPlacesCached,
  getCityPlacesCached,
  getFictionPlacesCached,
  getPlaceLocationByIdCached,
  getPlaceLocationByIdDetailCached,
  listCityIdsWithPlacesCached,
  listMapSearchCatalogCached,
  listPlacesInBboxForFictionIds,
} from "./place.queries"
import type { MapSearchCatalog } from "@/src/places/domain/map-search-catalog.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { CreatePlaceData, UpdatePlaceData } from "@/src/places/domain/place.schemas"
import { getFictionByIdCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { createContributionAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import { parsePlaceContributeFormData } from "@/src/places/domain/place-contribute.schemas"
import type {
  CreatePlaceResult,
  CreateContributorPlaceResult,
  UpdatePlaceResult,
  DeletePlaceResult,
  UploadPlaceImageResult,
} from "./place.actions.types"

export type {
  CreatePlaceResult,
  CreateContributorPlaceResult,
  UpdatePlaceResult,
  DeletePlaceResult,
  UploadPlaceImageResult,
} from "./place.actions.types"

const CREATE_PLACE_CONTRIBUTION = {
  type: "create_place" as const,
  entityType: "place" as const,
}

async function recordCreatePlaceContribution(
  placeId: string,
  logContext: string,
): Promise<boolean | undefined> {
  const payload = { ...CREATE_PLACE_CONTRIBUTION, entityId: placeId }
  try {
    const res = await createContributionAction(payload)
    if (!res.success) {
      console.error(`[${logContext}] createContributionAction failed`, {
        ...payload,
        error: res.error,
      })
      return undefined
    }
    return res.autoApproved
  } catch (err) {
    console.error(`[${logContext}] createContributionAction threw`, {
      ...payload,
      error: err instanceof Error ? err.message : String(err),
    })
    return undefined
  }
}

export async function uploadPlaceImageAction(
  placeId: string,
  formData: FormData,
): Promise<UploadPlaceImageResult> {
  const file = formData.get("file") as File | null
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file provided" }
  }
  const validationError = validateImageFile(file)
  if (validationError) return { success: false, error: validationError }

  const result = await uploadEntityImage({
    entityType: "place",
    entityId: placeId,
    role: "avatar",
    variants: ["sm", "lg"],
    file,
    replace: true,
  })

  if (!result.success) return result

  revalidatePath("/admin")
  updateTag("places")
  return { success: true, avatarUrl: result.urls.sm }
}

export async function getAllPlacesAction(): Promise<Place[]> {
  return getAllPlacesCached()
}

export async function getPlaceLocationAction(placeId: string): Promise<Place | null> {
  if (!uuidSchema.safeParse(placeId).success) return null
  return getPlaceLocationByIdCached(placeId)
}

/** Full place row with large avatar (same as fiction place detail page). */
export async function getPlaceLocationDetailAction(placeId: string): Promise<Place | null> {
  if (!uuidSchema.safeParse(placeId).success) return null
  return getPlaceLocationByIdDetailCached(placeId)
}

export async function getFictionPlacesAction(fictionId: string): Promise<Place[]> {
  if (!uuidSchema.safeParse(fictionId).success) return []
  return getFictionPlacesCached(fictionId)
}

export async function getCityPlacesAction(cityId: string): Promise<Place[]> {
  if (!uuidSchema.safeParse(cityId).success) return []
  return getCityPlacesCached(cityId)
}

export async function getPlacesInBboxAction(fictionIds: string[], bbox: MapBbox): Promise<Place[]> {
  const { west, south, east, north } = bbox
  if (![west, south, east, north].every((n) => Number.isFinite(n))) return []
  return listPlacesInBboxForFictionIds(fictionIds, bbox)
}

/** City IDs that have at least one place (map city picker: disable others). */
export async function getCityIdsWithPlacesAction(): Promise<string[]> {
  return listCityIdsWithPlacesCached()
}

/** Fiction × city pairs and cities with places (map unified search). */
export async function getMapSearchCatalogAction(): Promise<MapSearchCatalog> {
  return listMapSearchCatalogCached()
}

export async function createPlaceAction(data: CreatePlaceData): Promise<CreatePlaceResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: "Unauthorized" }

  const isStaffModerator = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  const { status, created_by } = resolveEntityContributionInsertDefaults(isStaffModerator, user.id)

  const result = await createPlaceUseCase({ ...data, status, created_by }, placesRepo)
  if (!result) return { success: false, error: "Failed to create place" }
  updateTag("places")
  const places = await getAllPlacesCached()
  return { success: true, createdPlaceId: result.placeId, places }
}

export async function updatePlaceAction(placeId: string, data: UpdatePlaceData): Promise<UpdatePlaceResult> {
  const ok = await updatePlaceUseCase(placeId, data, placesRepo)
  if (!ok) return { success: false, error: "Place not found or update failed" }
  updateTag("places")
  return { success: true }
}

export async function deletePlaceAction(placeId: string): Promise<DeletePlaceResult> {
  const ok = await deletePlaceUseCase(placeId, placesRepo)
  if (!ok) return { success: false, error: "Place not found or delete failed" }
  updateTag("places")
  return { success: true }
}

/** Contributor flow: server sets place status and created_by from session (client cannot override). */
export async function createContributorPlaceWithImageAction(
  formData: FormData,
): Promise<CreateContributorPlaceResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = parsePlaceContributeFormData(formData)
  if (!parsed.success) return { success: false, error: parsed.error }

  const isStaffModerator = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  const { status, created_by } = resolveEntityContributionInsertDefaults(isStaffModerator, user.id)

  const locationName =
    parsed.data.locationName.trim() ||
    parsed.data.formattedAddress.trim().split(",")[0]?.trim() ||
    "Location"

  const result = await createPlaceUseCase(
    {
      fictionId: parsed.data.fictionId,
      cityId: parsed.data.cityId,
      locationName,
      placeName: parsed.data.placeName,
      formattedAddress: parsed.data.formattedAddress,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      description: parsed.data.description,
      isLandmark: parsed.data.isLandmark,
      locationType: parsed.data.locationType ?? null,
      streetViewReference: parsed.data.streetViewReference ?? null,
      status,
      created_by,
    },
    placesRepo,
  )
  if (!result) return { success: false, error: "Failed to create place" }

  const contributionAutoApproved = await recordCreatePlaceContribution(
    result.placeId,
    "createContributorPlaceWithImageAction",
  )

  if (parsed.imageFile) {
    const validationError = validateImageFile(parsed.imageFile)
    if (!validationError) {
      await uploadEntityImage({
        entityType: "place",
        entityId: result.placeId,
        role: "avatar",
        variants: ["sm", "lg"],
        file: parsed.imageFile,
        replace: true,
      })
    }
  }

  revalidatePath("/admin")
  revalidatePath("/contributions")
  updateTag("places")
  updateTag(`place-${result.placeId}`)
  updateTag("contributions")

  const fiction = await getFictionByIdCached(parsed.data.fictionId)

  const out: CreateContributorPlaceResult = {
    success: true,
    placeId: result.placeId,
    placeSlug: result.slug,
    fictionId: parsed.data.fictionId,
    fictionSlug: fiction?.slug ?? "",
  }
  if (typeof contributionAutoApproved === "boolean") {
    return { ...out, contributionAutoApproved }
  }
  return out
}
