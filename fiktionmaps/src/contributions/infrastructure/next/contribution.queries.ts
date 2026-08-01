import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { unstable_cache } from "next/cache"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import type { Database } from "@/supabase/database.types"
import { getContributionByIdUseCase } from "@/src/contributions/application/get-contribution-by-id.usecase"
import { getContributionsByUserUseCase } from "@/src/contributions/application/get-contributions-by-user.usecase"
import { getProfileContributionsByUserUseCase } from "@/src/contributions/application/get-profile-contributions-by-user.usecase"
import { getApprovedByEntityUseCase } from "@/src/contributions/application/get-approved-by-entity.usecase"
import { getFictionContributorsUseCase } from "@/src/contributions/application/get-fiction-contributors.usecase"
import { getContributorsFirstContributionByEntityUseCase } from "@/src/contributions/application/get-contributors-first-contribution-by-entity.usecase"
import { getPendingContributionsUseCase } from "@/src/contributions/application/get-pending-contributions.usecase"
import { getStaffContributionDetailUseCase } from "@/src/contributions/application/get-staff-contribution-detail.usecase"
import { getStaffFictionContributionsFeedPageUseCase } from "@/src/contributions/application/get-staff-fiction-contributions-feed-page.usecase"
import { getStaffCreateContributionsFeedPageUseCase } from "@/src/contributions/application/get-staff-create-contributions-feed-page.usecase"
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
  FictionContributorRankedProfile,
  PlaceContributionFeedItem,
  ProfileContributionItem,
  StaffContributionsFeedKind,
  StaffCreateContributionFeedItem,
  StaffCreateContributionsFeedPageResult,
  StaffFictionContributionsFeedPageResult,
  StaffFictionContributionsFeedStatusTab,
  TopContributorProfile,
} from "@/src/contributions/domain/contribution.entity"
import {
  createContributionsSupabaseAdapter,
  supabaseRepositoryAdapter as contributionsCookieRepo,
} from "@/src/contributions/infrastructure/supabase/contribution.repository.impl"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { getIsUserStaff } from "@/src/users/infrastructure/next/user.queries"
import { CacheKeys } from "@/src/shared/infrastructure/next/cache.keys"
import { CacheConfig } from "@/src/shared/infrastructure/next/cache.config"

const anon = () => Promise.resolve(createAnonymousClient())
const anonRepo = createContributionsSupabaseAdapter(anon)

type StaffContributionsSession = {
  supabase: SupabaseClient<Database>
}

const getStaffContributionsSession = cache(async (): Promise<StaffContributionsSession | null> => {
  const userId = await getSessionUserId()
  if (!userId) return null
  const staff = await getIsUserStaff(userId)
  if (!staff) return null
  const supabase = await createClient()
  return { supabase }
})

function staffContributionsRepo(session: StaffContributionsSession) {
  return createContributionsSupabaseAdapter(async () => session.supabase)
}

/** Caller must ensure userId matches the authenticated session (or rely on RLS). */
export function getContributionsByUserCached(userId: string) {
  return unstable_cache(
    () => getContributionsByUserUseCase(userId, anonRepo),
    CacheKeys.contributionUser(userId),
    { ...CacheConfig.medium, tags: ["contributions", `contributions-user-${userId}`] },
  )()
}

/**
 * Current user's contributions for the profile page (with entity labels).
 * Request-scoped. Uses module-level repo singletons only — never construct a
 * fresh `createContributionsSupabaseAdapter()` per call (React `cache()` inside
 * the factory must stay stable at module scope).
 */
export const getCurrentUserContributions = cache(async (): Promise<ProfileContributionItem[]> => {
  const userId = await getSessionUserId()
  if (!userId) return []
  return getProfileContributionsForViewer(userId)
})

/**
 * Contributions visible to the current session for a profile page.
 * Own profile: all statuses (cookie RLS). Other users: approved only (public SELECT).
 */
export const getProfileContributionsForViewer = cache(
  async (profileUserId: string): Promise<ProfileContributionItem[]> => {
    const sessionUserId = await getSessionUserId()
    if (!sessionUserId) return []

    if (sessionUserId === profileUserId) {
      const ownRows = await getProfileContributionsByUserUseCase(
        profileUserId,
        contributionsCookieRepo,
      )
      if (ownRows.length > 0) return ownRows
      return getProfileContributionsByUserUseCase(profileUserId, anonRepo)
    }

    return getProfileContributionsByUserUseCase(profileUserId, anonRepo)
  },
)

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

export function getFictionContributorsCached(fictionId: string): Promise<FictionContributorRankedProfile[]> {
  return unstable_cache(
    () => getFictionContributorsUseCase(fictionId, anonRepo),
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
  const session = await getStaffContributionsSession()
  if (!session) return []
  return getPendingContributionsUseCase(staffContributionsRepo(session))
}

/** create_fiction / create_place staff queue (paginated); staff session only. */
export async function getCreateContributionsFeedPageForStaffSession(options: {
  page: number
  statusTab: StaffFictionContributionsFeedStatusTab
  submitterUserId: string
  kind: StaffContributionsFeedKind
}): Promise<StaffCreateContributionsFeedPageResult> {
  const session = await getStaffContributionsSession()
  if (!session) return { items: [], totalCount: 0 }

  const pageSize = STAFF_FICTION_CONTRIBUTIONS_FEED_PAGE_SIZE
  const safePage = Number.isFinite(options.page) && options.page >= 1 ? Math.floor(options.page) : 1
  const offset = (safePage - 1) * pageSize
  return getStaffCreateContributionsFeedPageUseCase(
    {
      kind: options.kind,
      userIdFilter: options.submitterUserId.trim() || undefined,
      statusTab: options.statusTab,
      limit: pageSize,
      offset,
    },
    staffContributionsRepo(session),
  )
}

/** @deprecated Prefer getCreateContributionsFeedPageForStaffSession with kind "fiction". */
export async function getFictionContributionsFeedPageForStaffSession(options: {
  page: number
  statusTab: StaffFictionContributionsFeedStatusTab
  submitterUserId: string
}): Promise<StaffFictionContributionsFeedPageResult> {
  const session = await getStaffContributionsSession()
  if (!session) return { items: [], totalCount: 0 }

  const pageSize = STAFF_FICTION_CONTRIBUTIONS_FEED_PAGE_SIZE
  const safePage = Number.isFinite(options.page) && options.page >= 1 ? Math.floor(options.page) : 1
  const offset = (safePage - 1) * pageSize
  return getStaffFictionContributionsFeedPageUseCase(
    {
      userIdFilter: options.submitterUserId.trim() || undefined,
      statusTab: options.statusTab,
      limit: pageSize,
      offset,
    },
    staffContributionsRepo(session),
  )
}

/** Single DB lookup for staff detail (fiction or place contribution). */
export async function getStaffContributionDetailForStaffSession(
  id: string,
): Promise<StaffCreateContributionFeedItem | null> {
  const session = await getStaffContributionsSession()
  if (!session) return null
  return getStaffContributionDetailUseCase(id, staffContributionsRepo(session))
}

export async function getFictionContributionDetailForStaffSession(
  id: string,
): Promise<FictionContributionFeedItem | null> {
  const item = await getStaffContributionDetailForStaffSession(id)
  if (!item || item.entityType !== "fiction") return null
  if (item.type !== "create_fiction" && item.type !== "add_photo") return null
  return item as FictionContributionFeedItem
}

export async function getPlaceContributionDetailForStaffSession(
  id: string,
): Promise<PlaceContributionFeedItem | null> {
  const item = await getStaffContributionDetailForStaffSession(id)
  if (!item || item.entityType !== "place") return null
  if (item.type !== "create_place" && item.type !== "add_photo") return null
  return item as PlaceContributionFeedItem
}

/** Submitter activity + FPP from profiles.fpp_total; staff session only. */
export async function getContributorModerationContextForStaffSession(
  userId: string,
): Promise<ContributorModerationContext | null> {
  const session = await getStaffContributionsSession()
  if (!session) return null
  const usersRepo = createUsersSupabaseAdapter(async () => session.supabase)
  return getContributorModerationContextUseCase(userId, {
    contributions: staffContributionsRepo(session),
    users: usersRepo,
  })
}

export function getTopContributorsCached(limit = 8): Promise<TopContributorProfile[]> {
  return unstable_cache(
    () => getTopContributorsUseCase(limit, anonRepo),
    CacheKeys.topContributors(limit),
    { ...CacheConfig.medium, tags: ["contributions", "top-contributors"] },
  )()
}
