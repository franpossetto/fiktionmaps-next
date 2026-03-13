export interface UpdateProfileData {
  username?: string | null
  avatar_url?: string | null
  bio?: string | null
  onboarding_completed?: boolean
}

export type UserRole = "user" | "admin"
