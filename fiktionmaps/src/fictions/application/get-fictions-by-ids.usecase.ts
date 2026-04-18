import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

export async function getFictionsByIdsUseCase(
  ids: string[],
  repo: FictionsRepositoryPort
): Promise<FictionWithMedia[]> {
  return repo.getByIds(ids)
}
