import type { MapBbox } from "@/lib/validation/map-query"
import type { City } from "@/src/cities/city.domain"
import type { Location } from "@/src/locations"
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

  listCitiesWithActiveScenes(
    fictionIds: string[] | null,
  ): Promise<Pick<City, "id" | "name" | "country">[]>

  listScenesWithVideoInBbox(params: { fictionIds: string[]; bbox: MapBbox }): Promise<Location[]>
}
