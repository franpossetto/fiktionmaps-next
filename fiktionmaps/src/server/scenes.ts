import { createScenesService, scenesSupabaseAdapter } from "@/src/scenes"

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
export const listScenesWithVideoInBbox = scenesService.listScenesWithVideoInBbox.bind(scenesService)
