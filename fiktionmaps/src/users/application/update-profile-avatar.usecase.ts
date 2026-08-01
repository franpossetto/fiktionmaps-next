import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"
import type { Profile } from "@/src/users/domain/user.entity"

export async function updateProfileAvatarUseCase(
  userId: string,
  avatarUrl: string,
  repo: UsersRepositoryPort
): Promise<Profile | null> {
  const trimmed = avatarUrl.trim()
  if (!trimmed) return null
  return repo.updateProfile(userId, { avatar_url: trimmed })
}
