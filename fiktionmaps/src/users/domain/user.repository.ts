import type { Profile } from "./user.entity"
import type { UpdateProfileData } from "./user.dtos"
import type { ProfilesPage } from "./user.views"

export interface UsersRepositoryPort {
  getProfile(userId: string): Promise<Profile | null>
  updateProfile(userId: string, updates: UpdateProfileData): Promise<Profile | null>
  listProfilesPage(page: number, pageSize: number): Promise<ProfilesPage>
}
