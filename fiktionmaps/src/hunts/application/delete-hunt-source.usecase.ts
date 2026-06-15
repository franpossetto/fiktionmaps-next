import type { HuntSourcesRepositoryPort } from "@/src/hunts/domain/hunt-source.repository"

export async function deleteHuntSourceUseCase(
  sourceId: string,
  userId: string,
  huntSourcesRepo: HuntSourcesRepositoryPort,
): Promise<void> {
  const source = await huntSourcesRepo.getById(sourceId)
  if (!source) throw new Error("Hunt source not found")
  if (source.createdBy !== userId) throw new Error("Forbidden")

  const ok = await huntSourcesRepo.delete(sourceId)
  if (!ok) throw new Error("Failed to delete source")
}
