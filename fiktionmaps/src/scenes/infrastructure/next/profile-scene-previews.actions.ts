"use server"

import { cache } from "react"
import { loadProfileScenesPreviewForCurrentUser } from "./profile-scene-previews.queries"

export type { ProfileScenePreview } from "@/src/scenes/domain/scene.entity"

/** Placeholder for future articles section on profile. */
export type ProfileArticlePreview = {
  id: string
  title: string
  subtitle: string
  imageUrl: string | null
}

/**
 * Request-scoped dedupe. If profile server render asks for scenes more than once,
 * we reuse the same query result within that request.
 */
export const getProfileScenesPreviewAction = cache(loadProfileScenesPreviewForCurrentUser)
