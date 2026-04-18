import type { UserRole } from "@/src/users/domain/user.dtos"

export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  gender: string | null
  phone: string | null
  date_of_birth: string | null
  onboarding_completed: boolean
  role: UserRole
  created_at: string
  updated_at: string
}
