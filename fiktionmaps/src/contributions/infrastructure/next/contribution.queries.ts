import { cache } from "react"
import { SupabaseNetworkError } from "@/lib/supabase/fetch"
import type { SupabaseClient } from "@supabase/supabase-js"
import { unstable_cache } from "next/cache"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import type { Database } from "@/supabase/database.types"
import { getContributionsByUserUseCase } from "@/src/contributions/application/get-contributions-by-user.usecase"
import { listProfileContributionsPageUseCase } from "@/src/contributions/application/list-profile-contributions-page.usecase"
import { getFictionContributorsUseCase } from "@/src/contributions/application/get-fiction-contributors.usecase"
import { getContributorsFirstContributionByEntityUseCase } from "@/src/contributions/application/get-contributors-first-contribution-by-entity.usecase"
import { getStaffContributionDetailUseCase } from "@/src/contributions/application/get-staff-contribution-detail.usecase"
import { getStaffCreateContributionsFeedPageUseCase } from "@/src/contributions/application/get-staff-create-contributions-feed-page.usecase"
import { getContributorModerationContextUseCase } from "@/src/contributions/application/get-contributor-moderation-context.usecase"
import { getTopContributorsUseCase } from "@/src/contributions/application/get-top-contributors.usecase"
import {
  PROFILE_CONTRIBUTIONS_PAGE_SIZE,
  STAFF_FICTION_CONTRIBUTIONS_FEED_PAGE_SIZE,
} from "@/src/contributions/domain/contribution.config"
import type {
  Contribution,
  ContributorModerationContext,
  ContributorProfileWithDate,
  FictionContributorRankedProfile,
  ProfileContributionItem,
  StaffContributionsFeedKind,
  StaffCreateContributionFeedItem,
  StaffCreateContributionsFeedPageResult,
  StaffFictionContributionsFeedStatusTab,
  TopContributorProfile,
} from "@/src/contributions/domain/contribution.entity"
import type {
  ContributionsRepositoryPort,
  ProfileContributionsPageResult,
} from "@/src/contributions/domain/contribution.repository"
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

export type ProfileContributionsProfileData = {
  preview: ProfileContributionsPageResult
  activity: ProfileContributionItem[]
}

function toActivityItems(rows: Contribution[]): ProfileContributionItem[] {
  return rows.map((row) => ({ ...row, entityLabel: null, parentLabel: null }))
}

async function loadProfileContributionsProfileData(
  profileUserId: string,
  repo: ContributionsRepositoryPort,
): Promise<ProfileContributionsProfileData> {
  const [preview, rows] = await Promise.all([
    listProfileContributionsPageUseCase(
      {
        userId: profileUserId,
        limit: PROFILE_CONTRIBUTIONS_PAGE_SIZE,
        offset: 0,
      },
      repo,
    ),
    getContributionsByUserUseCase(profileUserId, repo),
  ])
  return { preview, activity: toActivityItems(rows) }
}

/**
 * Preview (first page, labeled) + activity (all rows, no entity labels) for a profile.
 * Own profile or staff: all statuses (cookie RLS). Other viewers: approved only.
 */
export const getProfileContributionsProfileData = cache(
  async (profileUserId: string): Promise<ProfileContributionsProfileData> => {
    const empty: ProfileContributionsProfileData = {
      preview: { items: [], totalCount: 0 },
      activity: [],
    }
    const sessionUserId = await getSessionUserId()
    if (!sessionUserId) return empty

    const isOwnProfile = sessionUserId === profileUserId
    const isStaff = !isOwnProfile ? await getIsUserStaff(sessionUserId) : false

    if (isOwnProfile || isStaff) {
      const data = await loadProfileContributionsProfileData(profileUserId, contributionsCookieRepo)
      if (data.preview.totalCount > 0 || data.activity.length > 0 || isStaff) return data
    }

    return loadProfileContributionsProfileData(profileUserId, anonRepo)
  },
)

export const getCurrentUserContributionsProfileData = cache(
  async (): Promise<ProfileContributionsProfileData> => {
    const userId = await getSessionUserId()
    if (!userId) return { preview: { items: [], totalCount: 0 }, activity: [] }
    return getProfileContributionsProfileData(userId)
  },
)

/**
 * One labeled page for the profile “see all” dialog.
 * Same visibility rules as `getProfileContributionsProfileData`.
 */
export const getProfileContributionsPageForViewer = cache(
  async (
    profileUserId: string,
    page: number,
  ): Promise<ProfileContributionsPageResult> => {
    const sessionUserId = await getSessionUserId()
    if (!sessionUserId) return { items: [], totalCount: 0 }

    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1
    const input = {
      userId: profileUserId,
      limit: PROFILE_CONTRIBUTIONS_PAGE_SIZE,
      offset: (safePage - 1) * PROFILE_CONTRIBUTIONS_PAGE_SIZE,
    }

    const isOwnProfile = sessionUserId === profileUserId
    const isStaff = !isOwnProfile ? await getIsUserStaff(sessionUserId) : false

    if (isOwnProfile || isStaff) {
      const pageResult = await listProfileContributionsPageUseCase(input, contributionsCookieRepo)
      if (pageResult.totalCount > 0 || isStaff) return pageResult
    }

    return listProfileContributionsPageUseCase(input, anonRepo)
  },
)

export function getFictionContributorsCached(fictionId: string): Promise<FictionContributorRankedProfile[]> {
  return unstable_cache(
    () => getFictionContributorsUseCase(fictionId, anonRepo),
    CacheKeys.fictionContributors(fictionId),
    { ...CacheConfig.medium, tags: ["contributions"] },
  )()
}

export async function getPlaceContributorsWithDatesCached(
  placeId: string,
): Promise<ContributorProfileWithDate[]> {
  try {
    return await unstable_cache(
      () => getContributorsFirstContributionByEntityUseCase("place", placeId, anonRepo),
      [...CacheKeys.placeContributorsDetail(placeId), "v2"],
      { ...CacheConfig.medium, tags: ["contributions"] },
    )()
  } catch (error) {
    if (error instanceof SupabaseNetworkError) return []
    throw error
  }
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

/** Single DB lookup for staff detail (fiction or place contribution). */
export async function getStaffContributionDetailForStaffSession(
  id: string,
): Promise<StaffCreateContributionFeedItem | null> {
  const session = await getStaffContributionsSession()
  if (!session) return null
  return getStaffContributionDetailUseCase(id, staffContributionsRepo(session))
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
