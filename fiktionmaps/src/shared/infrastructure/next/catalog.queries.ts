import { unstable_cache } from "next/cache"
import {
  citiesRepoPublic,
  fictionsRepoPublic,
  placesRepoPublic,
} from "@/src/shared/infrastructure/supabase/anon-repos"
import {
  getCatalogEntityCountsUseCase,
  type CatalogEntityCounts,
} from "@/src/shared/application/get-catalog-entity-counts.usecase"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

export type { CatalogEntityCounts }

export function getCatalogEntityCountsCached(): Promise<CatalogEntityCounts> {
  return unstable_cache(
    () =>
      getCatalogEntityCountsUseCase({
        fictions: fictionsRepoPublic,
        cities: citiesRepoPublic,
        places: placesRepoPublic,
      }),
    ["catalog-entity-counts"],
    { ...CacheConfig.medium, tags: ["fictions", "cities", "places"] },
  )()
}
