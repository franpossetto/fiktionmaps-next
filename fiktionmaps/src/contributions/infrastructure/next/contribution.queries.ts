import { unstable_cache } from "next/cache"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import { getContributionByIdUseCase } from "@/src/contributions/application/get-contribution-by-id.usecase"
import { getContributionsByUserUseCase } from "@/src/contributions/application/get-contributions-by-user.usecase"
import { getApprovedByEntityUseCase } from "@/src/contributions/application/get-approved-by-entity.usecase"
import { getContributorsByEntityUseCase } from "@/src/contributions/application/get-contributors-by-entity.usecase"
import { getContributorsFirstContributionByEntityUseCase } from "@/src/contributions/application/get-contributors-first-contribution-by-entity.usecase"
import { getPendingContributionsUseCase } from "@/src/contributions/application/get-pending-contributions.usecase"
import { getStaffFictionContributionDetailUseCase } from "@/src/contributions/application/get-staff-fiction-contribution-detail.usecase"
import { getStaffFictionContributionsFeedPageUseCase } from "@/src/contributions/application/get-staff-fiction-contributions-feed-page.usecase"
import { getStaffCreateContributionsFeedPageUseCase } from "@/src/contributions/application/get-staff-create-contributions-feed-page.usecase"
import { getStaffPlaceContributionDetailUseCase } from "@/src/contributions/application/get-staff-place-contribution-detail.usecase"
import { getContributorModerationContextUseCase } from "@/src/contributions/application/get-contributor-moderation-context.usecase"
import { getTopContributorsUseCase } from "@/src/contributions/application/get-top-contributors.usecase"
import {
  STAFF_FICTION_CONTRIBUTIONS_FEED_PAGE_SIZE,
} from "@/src/contributions/domain/contribution.config"
import type {
  Contribution,
  ContributionEntityType,
  ContributorModerationContext,
  ContributorProfileWithDate,
  FictionContributionFeedItem,
  FictionContributorProfile,
  PlaceContributionFeedItem,
  StaffContributionsFeedKind,
  StaffCreateContributionsFeedPageResult,
  StaffFictionContributionsFeedPageResult,
  StaffFictionContributionsFeedStatusTab,
  TopContributorProfile,
} from "@/src/contributions/domain/contribution.entity"
import { createContributionsSupabaseAdapter } from "@/src/contributions/infrastructure/supabase/contribution.repository.impl"
import { getIsUserStaff } from "@/src/users/infrastructure/next/user.queries"
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
 * Pending contributions for the current Supabase session.
 * Caller must invoke from a trusted server boundary (staff-only pages). Requires admin or moderator JWT.
 */
export async function getPendingContributionsForStaffSession(): Promise<Contribution[]> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return []
  const staff = await getIsUserStaff(user.id)
  if (!staff) return []
  const repo = createContributionsSupabaseAdapter(async () => supabase)
  return getPendingContributionsUseCase(repo)
}

/** create_fiction / create_place staff queue (paginated); staff session only. */
export async function getCreateContributionsFeedPageForStaffSession(options: {
  page: number
  statusTab: StaffFictionContributionsFeedStatusTab
  submitterUserId: string
  kind: StaffContributionsFeedKind
}): Promise<StaffCreateContributionsFeedPageResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { items: [], totalCount: 0 }
  const staff = await getIsUserStaff(user.id)
  if (!staff) return { items: [], totalCount: 0 }

  const pageSize = STAFF_FICTION_CONTRIBUTIONS_FEED_PAGE_SIZE
  const safePage = Number.isFinite(options.page) && options.page >= 1 ? Math.floor(options.page) : 1
  const offset = (safePage - 1) * pageSize
  const repo = createContributionsSupabaseAdapter(async () => supabase)
  return getStaffCreateContributionsFeedPageUseCase(
    {
      kind: options.kind,
      userIdFilter: options.submitterUserId.trim() || undefined,
      statusTab: options.statusTab,
      limit: pageSize,
      offset,
    },
    repo,
  )
}

/** @deprecated Prefer getCreateContributionsFeedPageForStaffSession with kind "fiction". */
export async function getFictionContributionsFeedPageForStaffSession(options: {
  page: number
  statusTab: StaffFictionContributionsFeedStatusTab
  submitterUserId: string
}): Promise<StaffFictionContributionsFeedPageResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { items: [], totalCount: 0 }
  const staff = await getIsUserStaff(user.id)
  if (!staff) return { items: [], totalCount: 0 }

  const pageSize = STAFF_FICTION_CONTRIBUTIONS_FEED_PAGE_SIZE
  const safePage = Number.isFinite(options.page) && options.page >= 1 ? Math.floor(options.page) : 1
  const offset = (safePage - 1) * pageSize
  const repo = createContributionsSupabaseAdapter(async () => supabase)
  return getStaffFictionContributionsFeedPageUseCase(
    {
      userIdFilter: options.submitterUserId.trim() || undefined,
      statusTab: options.statusTab,
      limit: pageSize,
      offset,
    },
    repo,
  )
}

export async function getFictionContributionDetailForStaffSession(
  id: string,
): Promise<FictionContributionFeedItem | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  const staff = await getIsUserStaff(user.id)
  if (!staff) return null
  const repo = createContributionsSupabaseAdapter(async () => supabase)
  return getStaffFictionContributionDetailUseCase(id, repo)
}

export async function getPlaceContributionDetailForStaffSession(
  id: string,
): Promise<PlaceContributionFeedItem | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  const staff = await getIsUserStaff(user.id)
  if (!staff) return null
  const repo = createContributionsSupabaseAdapter(async () => supabase)
  return getStaffPlaceContributionDetailUseCase(id, repo)
}

/** Submitter activity + lifetime FPP (profiles.fpp_total); staff session only. */
export async function getContributorModerationContextForStaffSession(
  userId: string,
): Promise<ContributorModerationContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  const staff = await getIsUserStaff(user.id)
  if (!staff) return null
  const contributions = createContributionsSupabaseAdapter(async () => supabase)
  return getContributorModerationContextUseCase(userId, { contributions })
}

export function getTopContributorsCached(limit = 8): Promise<TopContributorProfile[]> {
  return unstable_cache(
    () => getTopContributorsUseCase(limit, anonRepo),
    CacheKeys.topContributors(limit),
    { ...CacheConfig.medium, tags: ["contributions", "top-contributors"] },
  )()
}
