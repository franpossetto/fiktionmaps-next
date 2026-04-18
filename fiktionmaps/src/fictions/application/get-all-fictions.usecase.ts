import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

export async function getAllFictionsUseCase(repo: FictionsRepositoryPort): Promise<FictionWithMedia[]> {
  return repo.getAll()
}
