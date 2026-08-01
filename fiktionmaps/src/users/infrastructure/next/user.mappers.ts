import type { Profile } from "@/src/users/domain/user.entity"
import type { UserProfile } from "@/src/users/domain/user.views"
import type { UserRole } from "@/src/users/domain/user.dtos"

export type ProfileWithOnboarding = UserProfile & {
  onboardingCompleted: boolean
  role: UserRole
  fppTotal: number
  fullName?: string
  gender?: string
  phone?: string
  dateOfBirth?: string
  avatarFocus?: { x: number; y: number } | null
}

/** Maps Supabase public.profiles row to the UI UserProfile shape. */
export function mapProfileToUserProfile(p: Profile): ProfileWithOnboarding {
  const hasFocus = p.avatar_focus_x != null || p.avatar_focus_y != null
  return {
    id: p.id,
    username: p.username?.trim() || "",
    avatar: p.avatar_url || "",
    avatarFocus: hasFocus
      ? { x: p.avatar_focus_x ?? 50, y: p.avatar_focus_y ?? 50 }
      : null,
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
    role: p.role,
    fppTotal: p.fpp_total ?? 0,
    fullName: p.full_name?.trim() || undefined,
    gender: p.gender ?? undefined,
    phone: p.phone ?? undefined,
    dateOfBirth: p.date_of_birth ?? undefined,
  }
}
