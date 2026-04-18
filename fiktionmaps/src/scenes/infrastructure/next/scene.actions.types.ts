import type { Scene } from "@/src/scenes/domain/scene.entity"

export type ListScenesQueryInput = Partial<{
  fictionId: string | null
  placeId: string | null
  locationId: string | null
  active: string | null
}>

export type CreateSceneResult =
  | { success: true; scene: Scene }
  | { success: false; error: string }

export type UpdateSceneResult =
  | { success: true; scene: Scene }
  | { success: false; error: string }

export type DeleteSceneResult =
  | { success: true }
  | { success: false; error: string }
