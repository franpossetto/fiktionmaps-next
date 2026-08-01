import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"
import type { Profile } from "@/src/users/domain/user.entity"

export async function getProfileByUsernameUseCase(
  username: string,
  repo: UsersRepositoryPort,
): Promise<Profile | null> {
  const trimmed = username.trim()
  if (!trimmed) return null
  return repo.getProfileByUsername(trimmed)
}
