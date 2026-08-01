import type { z } from "zod"
import type { City } from "@/src/cities/domain/city.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { fictionRowStatusSchema } from "@/src/fictions/domain/fiction.schemas"
import type { ProfileScenePreview, Scene, ScenePlace } from "./scene.entity"
import type { CreateSceneData, LinkScenePlaceData, UpdateSceneData } from "./scene.schemas"

type SceneRowStatus = z.infer<typeof fictionRowStatusSchema>

export interface SceneListFilters {
  fictionId?: string
  placeId?: string
  active?: boolean
}

export interface ScenesRepositoryPort {
  getById(id: string): Promise<Scene | null>
  /** True when the scene exists with `status = approved` and `active = true`. */
  isApprovedActiveScene(sceneId: string): Promise<boolean>
  list(filters: SceneListFilters): Promise<Scene[]>
  /**
   * Lightweight approved+active scenes for contribute pickers (no thumbnails round-trip;
   * includes place-less scenes so contributors can link the first place).
   */
  listContributePickerByFictionId(fictionId: string): Promise<Scene[]>
  countByFictionIds(fictionIds: string[]): Promise<Record<string, number>>
  create(data: CreateSceneData, createdBy: string | null, status: SceneRowStatus): Promise<Scene | null>
  update(id: string, data: UpdateSceneData): Promise<Scene | null>
  delete(id: string): Promise<boolean>

  /** Links one place to a scene. `sortOrder` is assigned server-side (`max(sortOrder) + 1`). */
  linkPlace(input: LinkScenePlaceData & { createdBy: string | null }): Promise<ScenePlace | null>

  listCitiesWithActiveScenes(fictionIds: string[] | null): Promise<City[]>

  listFictionIdsWithScenesInCity(cityId: string): Promise<string[]>

  /** All scenes with video for fictions in this city (no geographic radius). */
  listScenesWithVideoInCity(params: { fictionIds: string[]; cityId: string }): Promise<Place[]>
  getScenesCreatedByUserId(userId: string): Promise<ProfileScenePreview[]>
}
