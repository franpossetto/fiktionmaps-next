import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import { primaryScenePlace, scenePlaceIds } from "@/src/scenes/domain/scene.helpers"

export type SceneWatchBundle = {
  fiction: FictionWithMedia
  scene: Scene
  /** Primary place (lowest `sortOrder`) among those belonging to the fiction. */
  place: Place
  /** All places of the scene that belong to the fiction. */
  places: Place[]
}

export type SceneWatchBundleDeps = {
  getFictionBySlug: (slug: string) => Promise<FictionWithMedia | null>
  getSceneById: (sceneId: string) => Promise<Scene | null>
  getPlacesByIds: (placeIds: string[]) => Promise<Place[]>
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

  const allPlaces = await deps.getPlacesByIds(scenePlaceIds(scene))
  const placeById = new Map(
    allPlaces.filter((p) => p.fictionId === fiction.id).map((p) => [p.id, p]),
  )
  // Preserve the scene's own place order (primary first), not the resolver's return order.
  const places = scenePlaceIds(scene)
    .map((id) => placeById.get(id))
    .filter((p): p is Place => p != null)
  if (places.length === 0) return null

  const primaryPlaceId = primaryScenePlace(scene)?.placeId
  const place =
    (primaryPlaceId ? placeById.get(primaryPlaceId) : undefined) ?? places[0]

  return { fiction, scene, place, places }
}
