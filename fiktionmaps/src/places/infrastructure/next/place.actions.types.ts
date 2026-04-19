import type { Location } from "@/src/locations/domain/location.entity"

export type CreatePlaceResult =
  | { success: true; createdPlaceId: string; locations: Location[] }
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
