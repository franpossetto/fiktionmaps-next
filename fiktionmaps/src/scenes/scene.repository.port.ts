import type { Scene } from "./scene.domain"

export interface ScenesRepositoryPort {
  getAll(): Promise<Scene[]>
  getByLocationId(locationId: string): Promise<Scene[]>
  getByFictionId(fictionId: string): Promise<Scene[]>
}
