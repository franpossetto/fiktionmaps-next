import type { Scene } from "./scene.domain"
import type { CreateSceneData, UpdateSceneData } from "./scene.dtos"

export interface SceneListFilters {
  fictionId?: string
  placeId?: string
  locationId?: string
  active?: boolean
}

export interface ScenesRepositoryPort {
  getAll(): Promise<Scene[]>
  getByLocationId(locationId: string): Promise<Scene[]>
  getByFictionId(fictionId: string): Promise<Scene[]>
  getByPlaceId(placeId: string): Promise<Scene[]>
  getById(id: string): Promise<Scene | null>
  list(filters: SceneListFilters): Promise<Scene[]>
  create(data: CreateSceneData, createdBy?: string | null): Promise<Scene | null>
  update(id: string, data: UpdateSceneData): Promise<Scene | null>
  delete(id: string): Promise<boolean>
}
