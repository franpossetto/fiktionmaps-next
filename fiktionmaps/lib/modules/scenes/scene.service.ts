import type { Scene } from "./scene.model"
import type { ISceneRepository } from "./scene.repository"

export class SceneService {
  constructor(private sceneRepo: ISceneRepository) {}

  async getAll(): Promise<Scene[]> {
    return this.sceneRepo.getAll()
  }

  async getByLocationId(locationId: string): Promise<Scene[]> {
    return this.sceneRepo.getByLocationId(locationId)
  }

  async getByFictionId(fictionId: string): Promise<Scene[]> {
    return this.sceneRepo.getByFictionId(fictionId)
  }
}
