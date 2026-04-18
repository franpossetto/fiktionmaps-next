import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { CreateFictionData } from "@/src/fictions/domain/fiction.schemas"

export async function createFictionUseCase(
  data: CreateFictionData,
  repo: FictionsRepositoryPort
): Promise<FictionWithMedia | null> {
  return repo.create(data)
}
