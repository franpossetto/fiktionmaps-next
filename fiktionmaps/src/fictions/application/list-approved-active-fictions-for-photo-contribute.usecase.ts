import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

export async function listApprovedActiveFictionsForPhotoContributeUseCase(
  fictionsRepo: FictionsRepositoryPort,
): Promise<FictionWithMedia[]> {
  return fictionsRepo.listApprovedActive()
}
