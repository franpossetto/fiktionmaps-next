import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"
import { isContributorUserRole } from "@/src/users/domain/user.roles"

export async function isUserContributorUseCase(
  userId: string,
  repo: UsersRepositoryPort
): Promise<boolean> {
  const profile = await repo.getProfile(userId)
  if (!profile) return false
  return isContributorUserRole(profile.role)
}
