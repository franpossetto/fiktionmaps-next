import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"
import { isStaffUserRole } from "@/src/users/domain/user.roles"

export async function isUserStaffUseCase(
  userId: string,
  repo: UsersRepositoryPort
): Promise<boolean> {
  const profile = await repo.getProfile(userId)
  if (!profile) return false
  return isStaffUserRole(profile.role)
}
