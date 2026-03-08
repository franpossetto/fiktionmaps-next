import scenesData from "@/data/scenes.json"
import type { Scene } from "./scene.model"
import type { ISceneRepository } from "./scene.repository"

export class MockSceneRepository implements ISceneRepository {
  private scenes: Scene[] = scenesData as Scene[]

  async getAll(): Promise<Scene[]> {
    return this.scenes
  }

  async getByLocationId(locationId: string): Promise<Scene[]> {
    return this.scenes.filter((s) => s.locationId === locationId)
  }

  async getByFictionId(fictionId: string): Promise<Scene[]> {
    return this.scenes.filter((s) => s.fictionId === fictionId)
  }
}
