import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { SuggestedPlace } from "@/src/places/domain/suggested-place.entity"

const DEFAULT_LIMIT = 8
const CANDIDATE_POOL = 24

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = out[i]
    const swap = out[j]
    if (current === undefined || swap === undefined) continue
    out[i] = swap
    out[j] = current
  }
  return out
}

export async function listSuggestedPlacesForWishlistUseCase(
  repo: PlacesRepositoryPort,
  limit = DEFAULT_LIMIT,
): Promise<SuggestedPlace[]> {
  const safeLimit = Math.min(DEFAULT_LIMIT, Math.max(1, Math.floor(limit)))
  const candidates = await repo.listSuggestedApprovedActive(CANDIDATE_POOL)
  const withImage = shuffle(candidates.filter((item) => item.placeImage))
  const withoutImage = shuffle(candidates.filter((item) => !item.placeImage))
  return [...withImage, ...withoutImage].slice(0, safeLimit)
}
