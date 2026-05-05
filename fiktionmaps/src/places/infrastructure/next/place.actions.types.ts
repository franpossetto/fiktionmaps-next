import type { Place } from "@/src/places/domain/place.entity"

export type CreatePlaceResult =
  | { success: true; createdPlaceId: string; places: Place[] }
  | { success: false; error: string }

export type UpdatePlaceResult =
  | { success: true }
  | { success: false; error: string }

export type DeletePlaceResult =
  | { success: true }
  | { success: false; error: string }

export type UploadPlaceImageResult =
  | { success: true; avatarUrl?: string }
  | { success: false; error: string }
