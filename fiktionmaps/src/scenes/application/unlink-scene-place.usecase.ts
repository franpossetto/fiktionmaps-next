import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { UnlinkScenePlaceData } from "@/src/scenes/domain/scene.schemas"

interface UnlinkScenePlaceDeps {
  scenesRepo: Pick<ScenesRepositoryPort, "getById" | "unlinkPlace">
}

export async function unlinkScenePlaceUseCase(
  data: UnlinkScenePlaceData,
  deps: UnlinkScenePlaceDeps,
): Promise<void> {
  const scene = await deps.scenesRepo.getById(data.sceneId)
  if (!scene) throw new Error("Scene not found")
  if (!scene.places.some((place) => place.placeId === data.placeId)) {
    throw new Error("Place is not linked to this scene")
  }

  const ok = await deps.scenesRepo.unlinkPlace(data.sceneId, data.placeId)
  if (!ok) throw new Error("Failed to unlink place")
}
