import type { HuntSourcesRepositoryPort } from "@/src/hunts/domain/hunt-source.repository"
import type { HuntSource } from "@/src/hunts/domain/hunt-source.entity"

export async function listHuntSourcesUseCase(
  userId: string,
  huntSourcesRepo: HuntSourcesRepositoryPort,
): Promise<HuntSource[]> {
  return huntSourcesRepo.listByCreatedBy(userId)
}
