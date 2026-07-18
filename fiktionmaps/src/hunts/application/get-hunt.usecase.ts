import type { HuntsRepositoryPort } from "@/src/hunts/domain/hunt.repository"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"

export async function getHuntByIdUseCase(
  huntId: string,
  huntsRepo: HuntsRepositoryPort,
): Promise<Hunt | null> {
  return huntsRepo.getById(huntId)
}

export async function listHuntsBySourceIdUseCase(
  sourceId: string,
  huntsRepo: HuntsRepositoryPort,
): Promise<Hunt[]> {
  return huntsRepo.listBySourceId(sourceId)
}
