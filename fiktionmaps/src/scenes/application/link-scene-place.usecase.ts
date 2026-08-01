import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { LinkScenePlaceData } from "@/src/scenes/domain/scene.schemas"
import type { ScenePlace } from "@/src/scenes/domain/scene.entity"

interface LinkScenePlaceDeps {
  scenesRepo: Pick<ScenesRepositoryPort, "getById" | "linkPlace">
}

export async function linkScenePlaceUseCase(
  data: LinkScenePlaceData,
  ctx: { userId: string | null },
  deps: LinkScenePlaceDeps,
): Promise<ScenePlace> {
  const scene = await deps.scenesRepo.getById(data.sceneId)
  if (!scene) throw new Error("Scene not found")

  const link = await deps.scenesRepo.linkPlace({ ...data, createdBy: ctx.userId })
  if (!link) throw new Error("Failed to link place")
  return link
}
