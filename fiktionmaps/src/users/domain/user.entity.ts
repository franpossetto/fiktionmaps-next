import type { UserRole } from "@/src/users/domain/user.dtos"

export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  /** Focal point from asset_images (profile/avatar); null when unset or character avatar. */
  avatar_focus_x: number | null
  avatar_focus_y: number | null
  bio: string | null
  gender: string | null
  phone: string | null
  date_of_birth: string | null
  onboarding_completed: boolean
  role: UserRole
  fpp_total: number
  created_at: string
  updated_at: string
}
