import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"
import type { UserInterestsRepositoryPort } from "@/src/user-interests/domain/user-interests.repository"
import type { FictionLikesRepositoryPort } from "@/src/fiction-likes/domain/fiction-likes.repository"
import type { Profile } from "@/src/users/domain/user.entity"

export async function completeOnboardingUseCase(
  userId: string,
  prefs: { avatarUrl?: string; interestIds?: string[]; fictionIds?: string[] },
  deps: {
    usersRepo: UsersRepositoryPort
    userInterestsRepo: UserInterestsRepositoryPort
    fictionLikesRepo: FictionLikesRepositoryPort
  }
): Promise<Profile | null> {
  const updated = await deps.usersRepo.updateProfile(userId, {
    onboarding_completed: true,
    ...(prefs.avatarUrl != null ? { avatar_url: prefs.avatarUrl } : {}),
  })

  await deps.userInterestsRepo.setForUser(userId, prefs.interestIds ?? [])
  await deps.fictionLikesRepo.setForUser(userId, prefs.fictionIds ?? [])

  return updated
}
