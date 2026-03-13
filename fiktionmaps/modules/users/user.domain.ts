export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}
