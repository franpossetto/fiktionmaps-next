import type { Scene } from "./scene.model"

export interface ISceneRepository {
  getAll(): Promise<Scene[]>
  getByLocationId(locationId: string): Promise<Scene[]>
  getByFictionId(fictionId: string): Promise<Scene[]>
}
