import type { Profile } from "./user.domain"
import type { UpdateProfileData } from "./user.dtos"
import type { UsersRepositoryPort } from "./user.repository.port"

interface UsersServiceDeps {
  usersRepo: UsersRepositoryPort
  getCurrentUserId: () => Promise<string | null>
}

export function createUsersService(deps: UsersServiceDeps) {
  async function getCurrentUserProfile(): Promise<Profile | null> {
    const userId = await deps.getCurrentUserId()
    if (!userId) return null
    return deps.usersRepo.getProfile(userId)
  }

  async function getUserProfile(userId: string): Promise<Profile | null> {
    return deps.usersRepo.getProfile(userId)
  }

  async function updateCurrentUserProfile(
    updates: UpdateProfileData
  ): Promise<Profile | null> {
    const userId = await deps.getCurrentUserId()
    if (!userId) return null
    return deps.usersRepo.updateProfile(userId, updates)
  }

  return {
    getCurrentUserProfile,
    getUserProfile,
    updateCurrentUserProfile,
  }
}
