import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

/** Public catalog: approved + active. Admin lists use getAll. */
export async function getActiveFictionsUseCase(repo: FictionsRepositoryPort): Promise<FictionWithMedia[]> {
  return repo.listApprovedActive()
}
