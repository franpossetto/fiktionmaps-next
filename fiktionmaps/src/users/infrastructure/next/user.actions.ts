"use server"

import { cache } from "react"
import { updateTag } from "next/cache"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { createClient } from "@/lib/supabase/server"
import { zodErrorMessage } from "@/lib/validation/http"
import { interestIdsBodySchema, toggleFictionLikeBodySchema } from "@/lib/validation/api-payloads"
import { isUuidString } from "@/lib/validation/primitives"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { createFictionLikesSupabaseAdapter } from "@/src/fiction-likes/infrastructure/supabase/fiction-likes.repository.impl"
import { createUserInterestsSupabaseAdapter } from "@/src/user-interests/infrastructure/supabase/user-interests.repository.impl"
import { completeOnboardingUseCase } from "@/src/users/application/complete-onboarding.usecase"
import { getUserFictionLikesUseCase } from "@/src/fiction-likes/application/get-user-fiction-likes.usecase"
import { toggleFictionLikeUseCase } from "@/src/fiction-likes/application/toggle-fiction-like.usecase"
import { getUserInterestIdsUseCase } from "@/src/user-interests/application/get-user-interest-ids.usecase"
import { setUserInterestsUseCase } from "@/src/user-interests/application/set-user-interests.usecase"
import { getProfileByUserIdCached } from "./user.queries"
import type { UserProfile } from "@/src/users/domain/user.views"

export type ProfileWithOnboarding = UserProfile & {
  onboardingCompleted: boolean
  gender?: string
  phone?: string
  dateOfBirth?: string
}

/**
 * Maps Supabase public.profiles row to the UI UserProfile shape.
 * Use when the profile page is driven by Supabase auth + profiles table.
 */
function profileToUserProfile(p: {
  id: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  gender?: string | null
  phone?: string | null
  date_of_birth?: string | null
  created_at: string
  onboarding_completed: boolean
}): ProfileWithOnboarding {
  return {
    id: p.id,
    username: p.username?.trim() || "",
    avatar: p.avatar_url || "/logo-icon.png",
    bio: p.bio || "",
    interests: [],
    joinedDate: p.created_at,
    visitedLocations: [],
    checkIns: [],
    favoriteLocations: [],
    stats: {
      totalVisits: 0,
      locationsExplored: 0,
      frictionsConnected: 0,
    },
    onboardingCompleted: p.onboarding_completed,
    gender: p.gender ?? undefined,
    phone: p.phone ?? undefined,
    dateOfBirth: p.date_of_birth ?? undefined,
  }
}

export type GetCurrentProfileResult =
  | { data: ProfileWithOnboarding; error: null }
  | { data: null; error: string | null }

async function fetchCurrentUserProfileAction(): Promise<GetCurrentProfileResult> {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return { data: null, error: null }
    }
    const profile = await getProfileByUserIdCached(userId)
    if (!profile) {
      return { data: null, error: null }
    }
    return {
      data: profileToUserProfile(profile),
      error: null,
    }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to load profile",
    }
  }
}

/** Request-scoped dedupe for repeated profile reads in the same render/request. */
export const getCurrentUserProfileAction = cache(fetchCurrentUserProfileAction)

export type CompleteOnboardingResult =
  | { data: true; error: null }
  | { data: null; error: string }

export async function completeOnboardingAction(prefs: {
  avatar?: string
  interests?: string[]
  fictions?: string[]
}): Promise<CompleteOnboardingResult> {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return { data: null, error: "Unauthorized" }
    }

    const interestIds = Array.from(
      new Set(
        (prefs.interests ?? []).filter(
          (id) => typeof id === "string" && id.trim().length > 0 && isUuidString(id.trim())
        )
      )
    )

    const fictionIds = Array.from(
      new Set(
        (prefs.fictions ?? []).filter(
          (id) => typeof id === "string" && id.trim().length > 0 && isUuidString(id.trim())
        )
      )
    )

    const updated = await completeOnboardingUseCase(
      userId,
      {
        avatarUrl: prefs.avatar,
        interestIds,
        fictionIds,
      },
      {
        usersRepo: createUsersSupabaseAdapter(createClient),
        userInterestsRepo: createUserInterestsSupabaseAdapter(createClient),
        fictionLikesRepo: createFictionLikesSupabaseAdapter(createClient),
      }
    )

    if (updated) {
      updateTag(`user-profile-${userId}`)
    }

    return updated ? { data: true, error: null } : { data: null, error: "Failed to update profile" }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to complete onboarding",
    }
  }
}

/** Fiction ids the current user has liked (same as former GET /api/user-fiction-likes). */
export async function getMyLikedFictionIdsAction(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return []

  return getUserFictionLikesUseCase(user.id, createFictionLikesSupabaseAdapter(createClient))
}

export type ToggleFictionLikeResult =
  | { success: true; liked: boolean; likeCount: number }
  | { success: false; error: string }

/** Toggle like for the current user (same as former POST /api/user-fiction-likes/toggle). */
export async function toggleFictionLikeAction(fictionId: string): Promise<ToggleFictionLikeResult> {
  const parsed = toggleFictionLikeBodySchema.safeParse({ fictionId })
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }
  const id = parsed.data.fictionId

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const result = await toggleFictionLikeUseCase(
      user.id,
      id,
      createFictionLikesSupabaseAdapter(createClient)
    )
    updateTag("fictions")
    return { success: true, ...result }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to toggle like" }
  }
}

/** Interest ids for the current user (same as former GET /api/user-interests). */
export async function getMyInterestIdsAction(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return []

  return getUserInterestIdsUseCase(user.id, createUserInterestsSupabaseAdapter(createClient))
}

export type SetMyInterestsResult =
  | { success: true }
  | { success: false; error: string }

/** Replace the current user's interest selections (same as former PUT /api/user-interests). */
export async function setMyInterestsAction(interestIds: string[]): Promise<SetMyInterestsResult> {
  const parsed = interestIdsBodySchema.safeParse({ interestIds })
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }
  const ids = parsed.data.interestIds

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await setUserInterestsUseCase(user.id, ids, createUserInterestsSupabaseAdapter(createClient))
    updateTag(`user-profile-${user.id}`)
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to set interests" }
  }
}
