import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

export async function getActiveFictionsUseCase(repo: FictionsRepositoryPort): Promise<FictionWithMedia[]> {
  const all = await repo.getAll()
  return all.filter((f) => f.active)
}
