import { createScenesService, scenesSupabaseAdapter } from "@/src/scenes"
import { fictionsRepoPublic } from "./anon-repos"

const scenesService = createScenesService({
  scenesRepo: scenesSupabaseAdapter,
})

export const listScenes = scenesService.list.bind(scenesService)
export const getSceneById = scenesService.getById.bind(scenesService)
export const getScenesByFictionId = scenesService.getByFictionId.bind(scenesService)
export const getScenesByLocationId = scenesService.getByLocationId.bind(scenesService)
export const getScenesByPlaceId = scenesService.getByPlaceId.bind(scenesService)
export const createScene = scenesService.create.bind(scenesService)
export const updateScene = scenesService.update.bind(scenesService)
export const deleteScene = scenesService.remove.bind(scenesService)

export const listCitiesWithActiveScenes = scenesService.listCitiesWithActiveScenes.bind(scenesService)
export const listFictionIdsWithScenesInCity =
  scenesService.listFictionIdsWithScenesInCity.bind(scenesService)
export const listScenesWithVideoInBbox = scenesService.listScenesWithVideoInBbox.bind(scenesService)
export const listScenesWithVideoInCity = scenesService.listScenesWithVideoInCity.bind(scenesService)

/** Fictions that have at least one active scene with video in the given city (sorted by title). */
export async function getCityFictionsWithScenesUncached(cityId: string) {
  const ids = await listFictionIdsWithScenesInCity(cityId)
  if (ids.length === 0) return []
  const fics = await fictionsRepoPublic.getByIds(ids)
  return fics.sort((a, b) => a.title.localeCompare(b.title))
}
