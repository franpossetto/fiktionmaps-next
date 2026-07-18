export interface UpdateProfileData {
  username?: string | null
  avatar_url?: string | null
  bio?: string | null
  gender?: string | null
  phone?: string | null
  date_of_birth?: string | null
  onboarding_completed?: boolean
}

export type UserRole = "user" | "contributor" | "moderator" | "admin"

export function parseProfileRole(raw: string | null | undefined): UserRole {
  if (raw === "admin" || raw === "moderator" || raw === "contributor" || raw === "user") return raw
  return "user"
}
