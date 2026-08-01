import type { Scene } from "@/src/scenes/domain/scene.entity"
import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"

export async function listFictionScenesForContributeUseCase(
  fictionId: string,
  repo: Pick<ScenesRepositoryPort, "listContributePickerByFictionId">,
): Promise<Scene[]> {
  return repo.listContributePickerByFictionId(fictionId)
}
