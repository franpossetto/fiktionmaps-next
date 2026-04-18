import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"
import type { ProfileScenePreview } from "@/src/scenes/domain/scene.entity"

export async function getScenesCreatedByUserUseCase(
  userId: string,
  repo: ScenesRepositoryPort,
): Promise<ProfileScenePreview[]> {
  return repo.getScenesCreatedByUserId(userId)
}
