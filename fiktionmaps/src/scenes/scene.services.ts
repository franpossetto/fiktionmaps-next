import type { Scene } from "./scene.domain"
import type { ScenesRepositoryPort } from "./scene.repository.port"

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

  return {
    getAll,
    getByLocationId,
    getByFictionId,
  }
}
