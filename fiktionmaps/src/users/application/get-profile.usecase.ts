import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"
import type { Profile } from "@/src/users/domain/user.entity"

export async function getProfileUseCase(
  userId: string,
  repo: UsersRepositoryPort
): Promise<Profile | null> {
  return repo.getProfile(userId)
}
