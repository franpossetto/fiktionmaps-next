import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"
import type { Profile } from "@/src/users/domain/user.entity"
import type { UpdateProfileData } from "@/src/users/domain/user.dtos"

export async function updateProfileUseCase(
  userId: string,
  updates: UpdateProfileData,
  repo: UsersRepositoryPort
): Promise<Profile | null> {
  return repo.updateProfile(userId, updates)
}
