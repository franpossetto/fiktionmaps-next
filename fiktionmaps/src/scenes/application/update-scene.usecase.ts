import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { UpdateSceneData } from "@/src/scenes/domain/scene.schemas"
import type { Scene } from "@/src/scenes/domain/scene.entity"

interface UpdateSceneDeps {
  scenesRepo: Pick<ScenesRepositoryPort, "getById" | "update">
  getFictionType: (fictionId: string) => Promise<string | null>
}

export async function updateSceneUseCase(
  sceneId: string,
  data: UpdateSceneData,
  deps: UpdateSceneDeps,
): Promise<Scene | null> {
  const existing = await deps.scenesRepo.getById(sceneId)
  if (!existing) return null

  const targetFictionId = data.fictionId ?? existing.fictionId
  const type = await deps.getFictionType(targetFictionId)
  if (type !== "movie" && type !== "tv-series") {
    throw new Error("Scenes are only allowed for movie or tv-series fictions")
  }

  return deps.scenesRepo.update(sceneId, data)
}
