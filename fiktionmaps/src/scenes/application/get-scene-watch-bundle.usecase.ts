import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"

export type SceneWatchBundle = {
  fiction: FictionWithMedia
  scene: Scene
  place: Place
}

export type SceneWatchBundleDeps = {
  getFictionBySlug: (slug: string) => Promise<FictionWithMedia | null>
  getSceneById: (sceneId: string) => Promise<Scene | null>
  getPlaceById: (placeId: string) => Promise<Place | null>
}

/**
 * Critical path for the public scene watch page (fiction + scene + place).
 * Fiction scene list + city "up next" rail stream separately.
 */
export async function getSceneWatchBundleUseCase(
  input: { fictionSlug: string; sceneId: string },
  deps: SceneWatchBundleDeps,
): Promise<SceneWatchBundle | null> {
  const fiction = await deps.getFictionBySlug(input.fictionSlug.trim())
  if (!fiction?.active) return null

  const scene = await deps.getSceneById(input.sceneId)
  if (!scene || scene.fictionId !== fiction.id) return null

  const place = await deps.getPlaceById(scene.placeId)
  if (!place || place.fictionId !== fiction.id) return null

  return { fiction, scene, place }
}
