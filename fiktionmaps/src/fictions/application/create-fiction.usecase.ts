import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { CreateFictionData } from "@/src/fictions/domain/fiction.schemas"
import { generateSlug, resolveUniqueSlug } from "@/src/fictions/domain/fiction-slug"

export async function createFictionUseCase(
  data: CreateFictionData,
  repo: FictionsRepositoryPort
): Promise<FictionWithMedia | null> {
  const base = data.slug?.trim() || generateSlug(data.title) || `fiction-${data.year}`
  const existing = await repo.findSlugsByPrefix(base)
  const slug = resolveUniqueSlug(base, data.year, existing)
  return repo.create({ ...data, slug })
}
