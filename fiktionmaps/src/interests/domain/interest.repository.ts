import type { InterestCatalogItem } from "./interest.entity"

export interface InterestRepositoryPort {
  getCatalogByLocale(locale: string): Promise<InterestCatalogItem[]>
}
