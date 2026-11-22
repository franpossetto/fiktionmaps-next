import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import { listScenesUseCase } from "@/src/scenes/application/list-scenes.usecase"

export type ListPublicScenesInput = {
  fictionId?: string
  placeId?: string
}

/**
 * Approved + active scenes whose parent fiction is also approved + active.
 * Status is filtered in the query because `Scene` does not carry it.
 */
export async function listPublicScenesUseCase(
  input: ListPublicScenesInput,
  deps: {
    scenes: Pick<ScenesRepositoryPort, "list">
    fictions: Pick<FictionsRepositoryPort, "isApprovedActiveFiction">
  },
): Promise<Scene[]> {
  const fictionId = input.fictionId?.trim() || undefined
  const placeId = input.placeId?.trim() || undefined
  if (!fictionId && !placeId) return []

  if (fictionId) {
    const fictionVisible = await deps.fictions.isApprovedActiveFiction(fictionId)
    if (!fictionVisible) return []
  }

  const scenes = await listScenesUseCase(
    { fictionId, placeId, active: true, status: "approved" },
    deps.scenes,
  )

  const fictionIds = [...new Set(scenes.map((scene) => scene.fictionId))]
  const visible = new Set<string>()
  await Promise.all(
    fictionIds.map(async (id) => {
      if (id === fictionId) {
        visible.add(id)
        return
      }
      if (await deps.fictions.isApprovedActiveFiction(id)) visible.add(id)
    }),
  )

  return scenes.filter((scene) => visible.has(scene.fictionId))
}
