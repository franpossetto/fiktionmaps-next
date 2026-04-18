import { unstable_cache } from "next/cache"
import { createAnonymousClient } from "@/lib/supabase/server"
import { createInterestSupabaseAdapter } from "@/src/interests/infrastructure/supabase/interest.repository.impl"
import { getInterestCatalogUseCase } from "@/src/interests/application/get-interest-catalog.usecase"
import type { InterestCatalogItem } from "@/src/interests/domain/interest.entity"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const DEFAULT_LOCALE = "en"

const anon = () => Promise.resolve(createAnonymousClient())
const repo = createInterestSupabaseAdapter(anon)

/** Active interests catalog with labels for the given locale. */
export function getInterestCatalogCached(locale: string): Promise<InterestCatalogItem[]> {
  const loc = locale?.trim() || DEFAULT_LOCALE
  return unstable_cache(
    () => getInterestCatalogUseCase(loc, repo),
    CacheKeys.interest(`catalog:${loc}`),
    { ...CacheConfig.long, tags: ["interests"] }
  )()
}
