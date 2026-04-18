import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { UpdateFictionData } from "@/src/fictions/domain/fiction.schemas"

export async function updateFictionUseCase(
  id: string,
  data: UpdateFictionData,
  repo: FictionsRepositoryPort
): Promise<FictionWithMedia | null> {
  return repo.update(id, data)
}
