import type { City } from "@/src/cities/domain/city.entity"
import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"
import type { UpdateCityData } from "@/src/cities/domain/city.schemas"
import { resolveUniqueCitySlug } from "@/src/cities/domain/city-slug"

/**
 * Updates city fields. Slug changes only when `data.slug` is provided explicitly
 * (name/country edits never rewrite a stable public URL).
 */
export async function updateCityUseCase(
  id: string,
  data: UpdateCityData,
  repo: CitiesRepositoryPort
): Promise<City | null> {
  if (data.slug !== undefined) {
    const existing = await repo.findSlugsByPrefix(data.slug, id)
    const slug = resolveUniqueCitySlug([data.slug], existing)
    return repo.update(id, { ...data, slug })
  }
  return repo.update(id, data)
}
