"use server"

import { getCurrentUserProfile, updateCurrentUserProfile } from "@/lib/users-service"
import type { UserProfile } from "@/lib/modules/users"

export type ProfileWithOnboarding = UserProfile & { onboardingCompleted: boolean }

/**
 * Maps Supabase public.profiles row to the UI UserProfile shape.
 * Use when the profile page is driven by Supabase auth + profiles table.
 */
function profileToUserProfile(p: {
  id: string
  username: string | null
  avatar_url: string | null
  bio: string | null
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
}): Promise<CompleteOnboardingResult> {
  try {
    const updated = await updateCurrentUserProfile({
      onboarding_completed: true,
      ...(prefs.avatar != null ? { avatar_url: prefs.avatar } : {}),
    })
    return updated ? { data: true, error: null } : { data: null, error: "Failed to update profile" }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to complete onboarding",
    }
  }
}
