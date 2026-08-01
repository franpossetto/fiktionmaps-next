import type { Scene, ScenePlace } from "./scene.entity"

/** First place of the scene (lowest `sortOrder`). Null when the scene has no links yet. */
export function primaryScenePlace(scene: Scene): ScenePlace | null {
  return scene.places[0] ?? null
}

export function scenePlaceIds(scene: Scene): string[] {
  return scene.places.map((p) => p.placeId)
}

export function sceneIncludesPlace(scene: Scene, placeId: string): boolean {
  return scene.places.some((p) => p.placeId === placeId)
}

/** List/feed thumb: prefer compressed preview, fall back to full clip. */
export function sceneListVideoUrl(
  scene: Pick<Scene, "previewUrl" | "videoUrl">,
): string | null {
  const preview = scene.previewUrl?.trim()
  if (preview) return preview
  return scene.videoUrl?.trim() || null
}
