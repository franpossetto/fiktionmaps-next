"use server"

import { getCurrentUserProfile, updateCurrentUserProfile } from "@/lib/app-services"
import { createClient } from "@/lib/supabase/server"
import type { UserProfile } from "@/src/users"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

export async function getCurrentUserProfileAction(): Promise<GetCurrentProfileResult> {
  try {
    const profile = await getCurrentUserProfile()
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

export type CompleteOnboardingResult =
  | { data: true; error: null }
  | { data: null; error: string }

export async function completeOnboardingAction(prefs: {
  avatar?: string
  interests?: string[]
  fictions?: string[]
}): Promise<CompleteOnboardingResult> {
  try {
    const updated = await updateCurrentUserProfile({
      onboarding_completed: true,
      ...(prefs.avatar != null ? { avatar_url: prefs.avatar } : {}),
    })

    // Persist onboarding interests.
    // These are user-specific preferences and should survive across devices/sessions.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: "Unauthorized" }
    }

    const interestIds = Array.from(
      new Set(
        (prefs.interests ?? []).filter(
          (id) => typeof id === "string" && id.trim().length > 0 && UUID_REGEX.test(id)
        )
      )
    )

    const fictionIds = Array.from(
      new Set(
        (prefs.fictions ?? []).filter(
          (id) => typeof id === "string" && id.trim().length > 0 && UUID_REGEX.test(id)
        )
      )
    )

    // Replace selection: delete current rows and (optionally) re-insert.
    const { error: delError } = await supabase
      .from("user_interests")
      .delete()
      .eq("user_id", user.id)

    if (delError) throw delError

    if (interestIds.length > 0) {
      const { error: insError } = await supabase.from("user_interests").insert(
        interestIds.map((interest_id) => ({
          user_id: user.id,
          interest_id,
          source: "onboarding",
        }))
      )
      if (insError) throw insError
    }

    // Persist onboarding fiction selections as likes.
    // Replace selection so user can toggle later without leftover rows.
    const { error: delFictionError } = await supabase
      .from("fiction_likes")
      .delete()
      .eq("user_id", user.id)

    if (delFictionError) throw delFictionError

    if (fictionIds.length > 0) {
      const { error: insFictionError } = await supabase.from("fiction_likes").insert(
        fictionIds.map((fiction_id) => ({
          user_id: user.id,
          fiction_id,
        }))
      )
      if (insFictionError) throw insFictionError
    }

    return updated ? { data: true, error: null } : { data: null, error: "Failed to update profile" }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to complete onboarding",
    }
  }
}
