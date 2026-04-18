import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

export async function getFictionByIdUseCase(
  id: string,
  repo: FictionsRepositoryPort
): Promise<FictionWithMedia | null> {
  return repo.getById(id)
}
