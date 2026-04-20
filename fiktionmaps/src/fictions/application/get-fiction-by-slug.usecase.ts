import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

export async function getFictionBySlugUseCase(
  slug: string,
  repo: FictionsRepositoryPort
): Promise<FictionWithMedia | null> {
  return repo.getBySlug(slug)
}
