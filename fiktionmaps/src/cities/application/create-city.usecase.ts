import type { City } from "@/src/cities/domain/city.entity"
import type { CitiesRepositoryPort } from "@/src/cities/domain/city.repository"
import type { CreateCityData } from "@/src/cities/domain/city.schemas"
import {
  citySlugCandidates,
  resolveUniqueCitySlug,
} from "@/src/cities/domain/city-slug"

const MAX_SLUG_INSERT_ATTEMPTS = 8

async function collectExistingSlugs(
  repo: CitiesRepositoryPort,
  candidates: string[]
): Promise<string[]> {
  const taken = new Set<string>()
  for (const candidate of candidates) {
    const found = await repo.findSlugsByPrefix(candidate)
    for (const slug of found) taken.add(slug)
  }
  return [...taken]
}

export async function createCityUseCase(
  data: CreateCityData,
  repo: CitiesRepositoryPort
): Promise<City | null> {
  const { region, ...rest } = data
  const candidates = citySlugCandidates({
    name: rest.name,
    country: rest.country,
    region,
  })

  for (let attempt = 0; attempt < MAX_SLUG_INSERT_ATTEMPTS; attempt++) {
    const existing = await collectExistingSlugs(repo, candidates)
    const slug = resolveUniqueCitySlug(candidates, existing)
    const created = await repo.create({ ...rest, slug })
    if (created) return created
    // Likely UNIQUE race; retry with a fresh slug list.
  }
  return null
}
