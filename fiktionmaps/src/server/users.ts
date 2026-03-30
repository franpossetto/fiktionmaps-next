import { getSessionUserId } from "@/lib/auth/auth.service"
import { createUsersService } from "@/src/users/user.services"
import { supabaseRepositoryAdapter } from "@/src/users/user.repository.adapter"

const usersService = createUsersService({
  usersRepo: supabaseRepositoryAdapter,
  getCurrentUserId: getSessionUserId,
})

export const getCurrentUserProfile = usersService.getCurrentUserProfile
export const getUserProfile = usersService.getUserProfile
export const updateCurrentUserProfile = usersService.updateCurrentUserProfile
