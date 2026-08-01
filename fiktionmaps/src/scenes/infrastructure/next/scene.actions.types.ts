import type { Scene, ScenePlace } from "@/src/scenes/domain/scene.entity"

export type ListScenesQueryInput = Partial<{
  fictionId: string | null
  placeId: string | null
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

export type LinkScenePlaceResult =
  | { success: true; scenePlace: ScenePlace }
  | { success: false; error: string }

export type CreateContributorSceneResult =
  | {
      success: true
      sceneId: string
      fictionId: string
      fictionSlug: string
      placeSlug: string
      contributionAutoApproved?: boolean
    }
  | { success: false; error: string }
