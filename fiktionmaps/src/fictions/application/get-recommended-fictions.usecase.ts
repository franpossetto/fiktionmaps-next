import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { FictionInterestsRepositoryPort } from "@/src/fiction-interests/domain/fiction-interests.repository"
import type { UserInterestsRepositoryPort } from "@/src/user-interests/domain/user-interests.repository"

interface GetRecommendedFictionsDeps {
  userInterestsRepo: Pick<UserInterestsRepositoryPort, "getInterestIdsByUserId">
  fictionInterestsRepo: Pick<FictionInterestsRepositoryPort, "getByInterestIds">
  fictionsRepo: Pick<FictionsRepositoryPort, "getByIds">
}

export async function getRecommendedFictionsUseCase(
  userId: string,
  limit: number,
  deps: GetRecommendedFictionsDeps
): Promise<FictionWithMedia[]> {
  const interestIds = await deps.userInterestsRepo.getInterestIdsByUserId(userId)
  if (interestIds.length === 0) return []

  const rows = await deps.fictionInterestsRepo.getByInterestIds(interestIds)

  const scoresByFiction = new Map<string, number>()
  for (const { fictionId, weight } of rows) {
    scoresByFiction.set(fictionId, (scoresByFiction.get(fictionId) ?? 0) + weight)
  }

  const sorted = [...scoresByFiction.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  const fictionIds = sorted.map(([id]) => id)
  if (fictionIds.length === 0) return []

  const fictions = await deps.fictionsRepo.getByIds(fictionIds)

  const scoreById = new Map(sorted)
  return fictions
    .filter((f) => f.active)
    .sort((a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0))
}
