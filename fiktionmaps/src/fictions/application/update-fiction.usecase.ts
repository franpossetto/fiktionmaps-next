import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { UpdateFictionData } from "@/src/fictions/domain/fiction.schemas"
import { resolveUniqueSlug } from "@/src/fictions/domain/fiction-slug"

export async function updateFictionUseCase(
  id: string,
  data: UpdateFictionData,
  repo: FictionsRepositoryPort
): Promise<FictionWithMedia | null> {
  if (data.slug !== undefined && data.slug !== null) {
    const existing = await repo.findSlugsByPrefix(data.slug, id)
    const year = data.year ?? new Date().getFullYear()
    const resolvedSlug = resolveUniqueSlug(data.slug, year, existing)
    data = { ...data, slug: resolvedSlug }
  }
  return repo.update(id, data)
}
