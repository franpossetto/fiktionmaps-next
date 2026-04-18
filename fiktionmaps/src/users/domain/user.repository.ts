import type { Profile } from "./user.entity"
import type { UpdateProfileData } from "./user.dtos"

export interface UsersRepositoryPort {
  getProfile(userId: string): Promise<Profile | null>
  updateProfile(userId: string, updates: UpdateProfileData): Promise<Profile | null>
}
