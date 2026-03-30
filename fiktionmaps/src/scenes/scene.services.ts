import type { MapBbox } from "@/lib/validation/map-query"
import type { City } from "@/src/cities/city.domain"
import type { CreateSceneData, UpdateSceneData } from "./scene.dtos"
import type { Scene } from "./scene.domain"
import type { Location } from "@/src/locations"
import type { SceneListFilters, ScenesRepositoryPort } from "./scene.repository.port"

interface ScenesServiceDeps {
  scenesRepo: ScenesRepositoryPort
}

export function createScenesService(deps: ScenesServiceDeps) {
  async function getAll(): Promise<Scene[]> {
    return deps.scenesRepo.getAll()
  }

  async function getByLocationId(locationId: string): Promise<Scene[]> {
    return deps.scenesRepo.getByLocationId(locationId)
  }

  async function getByFictionId(fictionId: string): Promise<Scene[]> {
    return deps.scenesRepo.getByFictionId(fictionId)
  }

  async function getByPlaceId(placeId: string): Promise<Scene[]> {
    return deps.scenesRepo.getByPlaceId(placeId)
  }

  async function getById(id: string): Promise<Scene | null> {
    return deps.scenesRepo.getById(id)
  }

  async function list(filters: SceneListFilters): Promise<Scene[]> {
    return deps.scenesRepo.list(filters)
  }

  async function create(data: CreateSceneData, createdBy?: string | null): Promise<Scene | null> {
    return deps.scenesRepo.create(data, createdBy)
  }

  async function update(id: string, data: UpdateSceneData): Promise<Scene | null> {
    return deps.scenesRepo.update(id, data)
  }

  async function remove(id: string): Promise<boolean> {
    return deps.scenesRepo.delete(id)
  }

  async function listCitiesWithActiveScenes(
    fictionIds: string[] | null,
  ): Promise<Pick<City, "id" | "name" | "country">[]> {
    return deps.scenesRepo.listCitiesWithActiveScenes(fictionIds)
  }

  async function listScenesWithVideoInBbox(params: {
    fictionIds: string[]
    bbox: MapBbox
  }): Promise<Location[]> {
    return deps.scenesRepo.listScenesWithVideoInBbox(params)
  }

  return {
    getAll,
    getByLocationId,
    getByFictionId,
    getByPlaceId,
    getById,
    list,
    create,
    update,
    remove,
    listCitiesWithActiveScenes,
    listScenesWithVideoInBbox,
  }
}
