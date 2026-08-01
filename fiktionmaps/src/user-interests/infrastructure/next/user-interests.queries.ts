import { cache } from "react"
import { createAnonymousClient, createClient } from "@/lib/supabase/server"
import { createInterestSupabaseAdapter } from "@/src/interests/infrastructure/supabase/interest.repository.impl"
import { createUserInterestsSupabaseAdapter } from "@/src/user-interests/infrastructure/supabase/user-interests.repository.impl"
import {
  getUserInterestTagsUseCase,
  type UserInterestTag,
} from "@/src/user-interests/application/get-user-interest-tags.usecase"

export type { UserInterestTag }

const anonInterestsRepo = createInterestSupabaseAdapter(() =>
  Promise.resolve(createAnonymousClient()),
)

/**
 * Interest tags (id + localized label) for a profile viewer session.
 * Uses the session client so RLS applies to `user_interests`.
 */
export const getUserInterestTagsForSession = cache(
  async (userId: string, locale: string): Promise<UserInterestTag[]> => {
    if (!userId.trim()) return []
    return getUserInterestTagsUseCase(userId, locale, {
      userInterestsRepo: createUserInterestsSupabaseAdapter(createClient),
      interestsRepo: anonInterestsRepo,
    })
  },
)
