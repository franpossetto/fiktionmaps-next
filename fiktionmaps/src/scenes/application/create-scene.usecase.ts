import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { CreateSceneData } from "@/src/scenes/domain/scene.schemas"
import type { Scene } from "@/src/scenes/domain/scene.entity"

interface CreateSceneDeps {
  scenesRepo: Pick<ScenesRepositoryPort, "create">
  getFictionType: (fictionId: string) => Promise<string | null>
}

export async function createSceneUseCase(
  data: CreateSceneData,
  userId: string,
  deps: CreateSceneDeps,
): Promise<Scene> {
  const type = await deps.getFictionType(data.fictionId)
  if (type !== "movie" && type !== "tv-series") {
    throw new Error("Scenes are only allowed for movie or tv-series fictions")
  }
  const scene = await deps.scenesRepo.create(data, userId)
  if (!scene) throw new Error("Failed to create scene")
  return scene
}
