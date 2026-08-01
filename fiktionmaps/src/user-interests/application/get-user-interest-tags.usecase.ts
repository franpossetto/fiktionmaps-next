import type { InterestRepositoryPort } from "@/src/interests/domain/interest.repository"
import { getInterestCatalogUseCase } from "@/src/interests/application/get-interest-catalog.usecase"
import type { UserInterestsRepositoryPort } from "@/src/user-interests/domain/user-interests.repository"

export type UserInterestTag = { id: string; label: string }

export async function getUserInterestTagsUseCase(
  userId: string,
  locale: string,
  deps: {
    userInterestsRepo: Pick<UserInterestsRepositoryPort, "getInterestIdsByUserId">
    interestsRepo: InterestRepositoryPort
  },
): Promise<UserInterestTag[]> {
  const [ids, catalog] = await Promise.all([
    deps.userInterestsRepo.getInterestIdsByUserId(userId),
    getInterestCatalogUseCase(locale, deps.interestsRepo),
  ])
  const labelById = new Map(catalog.map((item) => [item.id, item.label]))
  return ids.flatMap((id) => {
    const label = labelById.get(id)
    return label != null ? [{ id, label }] : []
  })
}
