import type { InterestCatalogItem } from "@/src/interests/domain/interest.entity"
import type { InterestRepositoryPort } from "@/src/interests/domain/interest.repository"

export async function getInterestCatalogUseCase(
  locale: string,
  repo: InterestRepositoryPort
): Promise<InterestCatalogItem[]> {
  return repo.getCatalogByLocale(locale)
}
