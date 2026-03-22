import type { CreateSceneData, UpdateSceneData } from "./scene.dtos"
import type { Scene } from "./scene.domain"
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
  }
}
