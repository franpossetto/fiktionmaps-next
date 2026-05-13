import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { FictionInterestsRepositoryPort } from "@/src/fiction-interests/domain/fiction-interests.repository"
import type { Place } from "@/src/places/domain/place.entity"

const SAME_CITY_LIMIT = 12
const RANDOM_PICK_COUNT = 3

export type FictionDetailRecommendationReason =
  | "same_city"
  | "shared_interests_no_places"
  | "shared_interests_no_city_peers"
  | "random_no_matches"
  | "random_no_places_no_interests"

export interface FictionDetailRecommendationsResult {
  fictions: FictionWithMedia[]
  reason: FictionDetailRecommendationReason
}

function shuffle<T>(array: T[]): T[] {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pick 3, 4, or 5 (or fewer if not enough candidates). */
function pickInterestBasedCount(maxAvailable: number): number {
  if (maxAvailable <= 0) return 0
  const desired = Math.floor(Math.random() * 3) + 3
  return Math.min(maxAvailable, desired)
}

export interface GetFictionDetailRecommendationsInput {
  fictionId: string
  interestIds: string[]
  /**
   * When set (e.g. RSC already loaded places), avoids a second locations fetch.
   * When omitted, places are loaded via `locationsRepo`.
   */
  places?: Place[]
}

interface GetFictionDetailRecommendationsDeps {
  placesRepo: {
    getFictionIdsByCityId(cityId: string): Promise<string[]>
  }
  locationsRepo: {
    getByFictionId(fictionId: string): Promise<Place[]>
  }
  fictionInterestsRepo: Pick<FictionInterestsRepositoryPort, "getByInterestIds">
  fictionsRepo: FictionsRepositoryPort
}

/**
 * Movie recommendations for fiction detail: same city (if this fiction has places) → shared interests → random.
 * All branches return active movies only (excluding the current fiction).
 */
export async function getFictionDetailRecommendationsUseCase(
  input: GetFictionDetailRecommendationsInput,
  deps: GetFictionDetailRecommendationsDeps
): Promise<FictionDetailRecommendationsResult> {
  const { fictionId, interestIds } = input
  const places = input.places ?? (await deps.locationsRepo.getByFictionId(fictionId))
  const hasPlaces = places.length > 0
  const hasInterestIds = interestIds.length > 0

  const activeMovieOthers = (rows: FictionWithMedia[]) =>
    rows.filter((f) => f.active && f.type === "movie" && f.id !== fictionId)

  async function sameCityMovies(): Promise<FictionWithMedia[]> {
    const cityIds = [...new Set(places.map((p) => p.location.cityId).filter(Boolean))]
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
    const movies = activeMovieOthers(fictions)
    movies.sort((a, b) => a.title.localeCompare(b.title))
    return movies.slice(0, SAME_CITY_LIMIT)
  }

  if (hasPlaces) {
    const fromCity = await sameCityMovies()
    if (fromCity.length > 0) {
      return { fictions: fromCity, reason: "same_city" }
    }
  }

  if (hasInterestIds) {
    const links = await deps.fictionInterestsRepo.getByInterestIds(interestIds)
    const idSet = new Set<string>()
    for (const row of links) {
      if (row.fictionId !== fictionId) idSet.add(row.fictionId)
    }
    const byInterest = activeMovieOthers(await deps.fictionsRepo.getByIds([...idSet]))
    if (byInterest.length > 0) {
      const take = pickInterestBasedCount(byInterest.length)
      const fictions = shuffle(byInterest).slice(0, take)
      return {
        fictions,
        reason: hasPlaces ? "shared_interests_no_city_peers" : "shared_interests_no_places",
      }
    }
  }

  const all = await deps.fictionsRepo.getAll()
  const pool = activeMovieOthers(all)
  if (pool.length === 0) {
    return {
      fictions: [],
      reason: !hasPlaces && !hasInterestIds ? "random_no_places_no_interests" : "random_no_matches",
    }
  }
  const take = Math.min(RANDOM_PICK_COUNT, pool.length)
  const fictions = shuffle(pool).slice(0, take)
  const reason =
    !hasPlaces && !hasInterestIds ? "random_no_places_no_interests" : "random_no_matches"
  return { fictions, reason }
}