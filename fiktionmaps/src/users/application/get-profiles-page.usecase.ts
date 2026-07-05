import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"
import type { ProfilesPage } from "@/src/users/domain/user.views"

export async function getProfilesPageUseCase(
  page: number,
  pageSize: number,
  usersRepo: UsersRepositoryPort,
): Promise<ProfilesPage> {
  return usersRepo.listProfilesPage(page, pageSize)
}
