import { unstable_cache } from "next/cache"
import { createAnonymousClient } from "@/lib/supabase/server"
import { getContributionByIdUseCase } from "@/src/contributions/application/get-contribution-by-id.usecase"
import { getContributionsByUserUseCase } from "@/src/contributions/application/get-contributions-by-user.usecase"
import { getApprovedByEntityUseCase } from "@/src/contributions/application/get-approved-by-entity.usecase"
import { getContributorsByEntityUseCase } from "@/src/contributions/application/get-contributors-by-entity.usecase"
import { getContributorsFirstContributionByEntityUseCase } from "@/src/contributions/application/get-contributors-first-contribution-by-entity.usecase"
import { getPendingContributionsUseCase } from "@/src/contributions/application/get-pending-contributions.usecase"
import { getTopContributorsUseCase } from "@/src/contributions/application/get-top-contributors.usecase"
import type {
  Contribution,
  ContributionEntityType,
  ContributorProfileWithDate,
  FictionContributorProfile,
  TopContributorProfile,
} from "@/src/contributions/domain/contribution.entity"
import { createContributionsSupabaseAdapter } from "@/src/contributions/infrastructure/supabase/contribution.repository.impl"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const anon = () => Promise.resolve(createAnonymousClient())
const anonRepo = createContributionsSupabaseAdapter(anon)

/** Caller must ensure userId matches the authenticated session (or rely on RLS). */
export function getContributionsByUserCached(userId: string) {
  return unstable_cache(
    () => getContributionsByUserUseCase(userId, anonRepo),
    CacheKeys.contributionUser(userId),
    { ...CacheConfig.medium, tags: ["contributions", `contributions-user-${userId}`] },
  )()
}

export function getContributionByIdCached(id: string) {
  return unstable_cache(
    () => getContributionByIdUseCase(id, anonRepo),
    CacheKeys.contribution(id),
    { ...CacheConfig.medium, tags: ["contributions", `contribution-${id}`] },
  )()
}

export function getApprovedByEntityCached(entityType: ContributionEntityType, entityId: string) {
  return unstable_cache(
    () => getApprovedByEntityUseCase(entityType, entityId, anonRepo),
    CacheKeys.contributionEntity(entityType, entityId),
    {
      ...CacheConfig.medium,
      tags: ["contributions", `${entityType}-${entityId}`],
    },
  )()
}

export function getFictionContributorsCached(fictionId: string): Promise<FictionContributorProfile[]> {
  return unstable_cache(
    () => getContributorsByEntityUseCase("fiction", fictionId, anonRepo),
    CacheKeys.fictionContributors(fictionId),
    { ...CacheConfig.medium, tags: ["contributions"] },
  )()
}

export function getPlaceContributorsWithDatesCached(placeId: string): Promise<ContributorProfileWithDate[]> {
  return unstable_cache(
    () => getContributorsFirstContributionByEntityUseCase("place", placeId, anonRepo),
    CacheKeys.placeContributorsDetail(placeId),
    { ...CacheConfig.medium, tags: ["contributions"] },
  )()
}

/**
 * Moderation queue — sensitive. Requires RLS restricting reads to moderator/admin roles,
 * or call only from server-only admin paths with an authenticated service role (not used here).
 */
export function getPendingContributionsCached(): Promise<Contribution[]> {
  return unstable_cache(
    () => getPendingContributionsUseCase(anonRepo),
    CacheKeys.contributionPending(),
    { ...CacheConfig.short, tags: ["contributions", "contributions-pending"] },
  )()
}

export function getTopContributorsCached(limit = 8): Promise<TopContributorProfile[]> {
  return unstable_cache(
    () => getTopContributorsUseCase(limit, anonRepo),
    CacheKeys.topContributors(limit),
    { ...CacheConfig.medium, tags: ["contributions", "top-contributors"] },
  )()
}
