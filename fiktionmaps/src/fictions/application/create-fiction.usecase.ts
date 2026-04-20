import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { CreateFictionData } from "@/src/fictions/domain/fiction.schemas"
import { resolveUniqueSlug } from "@/src/fictions/domain/fiction-slug"

export async function createFictionUseCase(
  data: CreateFictionData,
  repo: FictionsRepositoryPort
): Promise<FictionWithMedia | null> {
  let slug = data.slug ?? null
  if (slug) {
    const existing = await repo.findSlugsByPrefix(slug)
    slug = resolveUniqueSlug(slug, data.year, existing)
  }
  return repo.create({ ...data, slug })
}
