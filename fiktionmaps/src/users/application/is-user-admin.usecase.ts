import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"

export async function isUserAdminUseCase(
  userId: string,
  repo: UsersRepositoryPort
): Promise<boolean> {
  const profile = await repo.getProfile(userId)
  return profile?.role === "admin"
}
