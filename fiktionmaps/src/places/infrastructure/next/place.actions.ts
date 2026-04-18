"use server"

import { revalidatePath, updateTag } from "next/cache"
import { uuidSchema } from "@/lib/validation/primitives"
import type { MapBbox } from "@/lib/validation/map-query"
import { supabaseRepositoryAdapter as placesRepo } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { createPlaceUseCase } from "@/src/places/application/create-place.usecase"
import { updatePlaceUseCase } from "@/src/places/application/update-place.usecase"
import { uploadEntityImage, validateImageFile } from "@/lib/asset-images/image-variant-service"
import { getAllPlacesCached, getPlaceLocationByIdCached, listPlacesInBboxForFictionIds } from "./place.queries"
import type { Location } from "@/src/locations/domain/location.entity"
import type { CreatePlaceData, UpdatePlaceData } from "@/src/places/domain/place.schemas"
import type { CreatePlaceResult, UpdatePlaceResult, UploadPlaceImageResult } from "./place.actions.types"

export type { CreatePlaceResult, UpdatePlaceResult, UploadPlaceImageResult } from "./place.actions.types"

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

export async function getAllPlacesAction(): Promise<Location[]> {
  return getAllPlacesCached()
}

export async function getPlaceLocationAction(placeId: string): Promise<Location | null> {
  if (!uuidSchema.safeParse(placeId).success) return null
  return getPlaceLocationByIdCached(placeId)
}

export async function getPlacesInBboxAction(fictionIds: string[], bbox: MapBbox): Promise<Location[]> {
  const { west, south, east, north } = bbox
  if (![west, south, east, north].every((n) => Number.isFinite(n))) return []
  return listPlacesInBboxForFictionIds(fictionIds, bbox)
}

export async function createPlaceAction(data: CreatePlaceData): Promise<CreatePlaceResult> {
  const result = await createPlaceUseCase(data, placesRepo)
  if (!result) return { success: false, error: "Failed to create place" }
  updateTag("places")
  const locations = await getAllPlacesCached()
  return { success: true, createdPlaceId: result.placeId, locations }
}

export async function updatePlaceAction(placeId: string, data: UpdatePlaceData): Promise<UpdatePlaceResult> {
  const ok = await updatePlaceUseCase(placeId, data, placesRepo)
  if (!ok) return { success: false, error: "Place not found or update failed" }
  updateTag("places")
  return { success: true }
}
