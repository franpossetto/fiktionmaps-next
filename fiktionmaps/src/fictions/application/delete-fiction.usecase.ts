import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

export async function deleteFictionUseCase(
  id: string,
  repo: FictionsRepositoryPort
): Promise<boolean> {
  return repo.delete(id)
}
