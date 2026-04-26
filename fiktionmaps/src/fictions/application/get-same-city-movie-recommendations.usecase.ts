import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { Location } from "@/src/locations/domain/location.entity"

const DEFAULT_LIMIT = 12

interface GetSameCityMovieRecommendationsDeps {
  locationsRepo: {
    getByFictionId(fictionId: string): Promise<Location[]>
  }
  placesRepo: {
    getFictionIdsByCityId(cityId: string): Promise<string[]>
  }
  fictionsRepo: FictionsRepositoryPort
}

export async function getSameCityMovieRecommendationsUseCase(
  fictionId: string,
  deps: GetSameCityMovieRecommendationsDeps,
  options?: { limit?: number },
): Promise<FictionWithMedia[]> {
  const limit = options?.limit ?? DEFAULT_LIMIT
  const locations = await deps.locationsRepo.getByFictionId(fictionId)
  const cityIds = [...new Set(locations.map((l) => l.cityId))]
  if (cityIds.length === 0) return []

  const idSet = new Set<string>()
  for (const cityId of cityIds) {
    const ids = await deps.placesRepo.getFictionIdsByCityId(cityId)
    for (const id of ids) {
      if (id && id !== fictionId) idSet.add(id)
    }
  }

  const candidateIds = [...idSet]
  if (candidateIds.length === 0) return []

  const fictions = await deps.fictionsRepo.getByIds(candidateIds)
  const movies = fictions.filter((f) => f.active && f.type === "movie")
  movies.sort((a, b) => a.title.localeCompare(b.title))
  return movies.slice(0, limit)
}
