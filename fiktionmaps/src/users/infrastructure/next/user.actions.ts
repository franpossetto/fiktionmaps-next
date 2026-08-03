"use server"

import { cache } from "react"
import { updateTag } from "next/cache"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { createClient } from "@/lib/supabase/server"
import { zodErrorMessage } from "@/lib/validation/http"
import { interestIdsBodySchema, toggleFictionLikeBodySchema } from "@/lib/validation/api-payloads"
import { isUuidString } from "@/lib/validation/primitives"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { createFictionLikesSupabaseAdapter } from "@/src/fiction-likes/infrastructure/supabase/fiction-likes.repository.impl"
import { createUserInterestsSupabaseAdapter } from "@/src/user-interests/infrastructure/supabase/user-interests.repository.impl"
import { completeOnboardingUseCase } from "@/src/users/application/complete-onboarding.usecase"
import { updateProfileAvatarUseCase } from "@/src/users/application/update-profile-avatar.usecase"
import { updateProfilePersonalInfoUseCase } from "@/src/users/application/update-profile-personal-info.usecase"
import type { UpdatePersonalInfoData } from "@/src/users/domain/user.dtos"
import { getUserFictionLikesUseCase } from "@/src/fiction-likes/application/get-user-fiction-likes.usecase"
import { toggleFictionLikeUseCase } from "@/src/fiction-likes/application/toggle-fiction-like.usecase"
import { getUserInterestIdsUseCase } from "@/src/user-interests/application/get-user-interest-ids.usecase"
import { setUserInterestsUseCase } from "@/src/user-interests/application/set-user-interests.usecase"
import { getSessionAccount } from "@/src/users/infrastructure/next/user.queries"
import { uploadEntityImage, validateImageFile } from "@/lib/asset-images/image-variant-service"
import { parseImageFocusFromFormData } from "@/lib/asset-images/image-focus"
import { updateAssetImageFocusUseCase } from "@/src/asset-images/application/update-asset-image-focus.usecase"
import {
  mapProfileToUserProfile,
  type ProfileWithOnboarding,
} from "@/src/users/infrastructure/next/user.mappers"

export type { ProfileWithOnboarding }

export type GetCurrentProfileResult =
  | { data: ProfileWithOnboarding; error: null }
  | { data: null; error: string | null }

async function fetchCurrentUserProfileAction(): Promise<GetCurrentProfileResult> {
  try {
    const { profile } = await getSessionAccount()
    return { data: profile, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to load profile",
    }
  }
}

/** Request-scoped dedupe for repeated profile reads in the same render/request. */
export const getCurrentUserProfileAction = cache(fetchCurrentUserProfileAction)

export type CompleteOnboardingResult =
  | { data: true; error: null }
  | { data: null; error: string }

export async function completeOnboardingAction(prefs: {
  avatar?: string
  interests?: string[]
  fictions?: string[]
}): Promise<CompleteOnboardingResult> {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return { data: null, error: "Unauthorized" }
    }

    const interestIds = Array.from(
      new Set(
        (prefs.interests ?? []).filter(
          (id) => typeof id === "string" && id.trim().length > 0 && isUuidString(id.trim())
        )
      )
    )

    const fictionIds = Array.from(
      new Set(
        (prefs.fictions ?? []).filter(
          (id) => typeof id === "string" && id.trim().length > 0 && isUuidString(id.trim())
        )
      )
    )

    const updated = await completeOnboardingUseCase(
      userId,
      {
        avatarUrl: prefs.avatar,
        interestIds,
        fictionIds,
      },
      {
        usersRepo: createUsersSupabaseAdapter(createClient),
        userInterestsRepo: createUserInterestsSupabaseAdapter(createClient),
        fictionLikesRepo: createFictionLikesSupabaseAdapter(createClient),
      }
    )

    if (updated) {
      updateTag(`user-profile-${userId}`)
    }

    return updated ? { data: true, error: null } : { data: null, error: "Failed to update profile" }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Failed to complete onboarding",
    }
  }
}

export type UpdateMyProfileAvatarResult =
  | { success: true; avatarUrl: string; focus: { x: number; y: number } }
  | { success: false; error: string }

/** Upload own profile photo to asset-images and persist public URL on profiles.avatar_url. */
export async function updateMyProfileAvatarAction(
  formData: FormData
): Promise<UpdateMyProfileAvatarResult> {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const file = formData.get("file")
    if (!(file instanceof File) || file.size <= 0) {
      return { success: false, error: "No image file provided" }
    }

    const validationError = validateImageFile(file)
    if (validationError) {
      return { success: false, error: validationError }
    }

    const focus = parseImageFocusFromFormData(formData)

    // lg (800px) for the large profile aside; xs/sm for chips/lists.
    const upload = await uploadEntityImage({
      entityType: "profile",
      entityId: userId,
      role: "avatar",
      variants: ["xs", "sm", "lg"],
      file,
      replace: true,
      focus,
    })
    if (!upload.success) {
      return { success: false, error: upload.error }
    }

    const avatarUrl =
      upload.urls.lg?.trim() || upload.urls.sm?.trim() || upload.urls.xs?.trim()
    if (!avatarUrl) {
      return { success: false, error: "Upload succeeded but no URL was returned" }
    }

    const updated = await updateProfileAvatarUseCase(
      userId,
      avatarUrl,
      createUsersSupabaseAdapter(createClient)
    )
    if (!updated) {
      return { success: false, error: "Failed to update profile" }
    }

    updateTag(`user-profile-${userId}`)
    return { success: true, avatarUrl, focus }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update profile photo",
    }
  }
}

export type UpdateMyProfileAvatarFocusResult =
  | { success: true; focus: { x: number; y: number } }
  | { success: false; error: string }

/** Reposition own profile photo without re-uploading. */
export async function updateMyProfileAvatarFocusAction(input: {
  focusX: number
  focusY: number
}): Promise<UpdateMyProfileAvatarFocusResult> {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const result = await updateAssetImageFocusUseCase({
      entityType: "profile",
      entityId: userId,
      role: "avatar",
      focus: { x: input.focusX, y: input.focusY },
    })
    if (!result.success) return result

    updateTag(`user-profile-${userId}`)
    return result
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update photo position",
    }
  }
}

export type UpdateMyProfilePersonalInfoResult =
  | { success: true; profile: ProfileWithOnboarding }
  | { success: false; error: string }

/** Update own personal info (bio, name, gender, phone, DOB). Username/email are not accepted. */
export async function updateMyProfilePersonalInfoAction(
  input: UpdatePersonalInfoData
): Promise<UpdateMyProfilePersonalInfoResult> {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const updated = await updateProfilePersonalInfoUseCase(
      userId,
      input,
      createUsersSupabaseAdapter(createClient)
    )
    if (!updated) {
      return { success: false, error: "Failed to update profile" }
    }

    updateTag(`user-profile-${userId}`)
    return { success: true, profile: mapProfileToUserProfile(updated) }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update profile",
    }
  }
}

/** Fiction ids the current user has liked (same as former GET /api/user-fiction-likes). */
export async function getMyLikedFictionIdsAction(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return []

  return getUserFictionLikesUseCase(user.id, createFictionLikesSupabaseAdapter(createClient))
}

export type ToggleFictionLikeResult =
  | { success: true; liked: boolean; likeCount: number }
  | { success: false; error: string }

/** Toggle like for the current user (same as former POST /api/user-fiction-likes/toggle). */
export async function toggleFictionLikeAction(fictionId: string): Promise<ToggleFictionLikeResult> {
  const parsed = toggleFictionLikeBodySchema.safeParse({ fictionId })
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }
  const id = parsed.data.fictionId

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const result = await toggleFictionLikeUseCase(
      user.id,
      id,
      createFictionLikesSupabaseAdapter(createClient)
    )
    updateTag("fictions")
    return { success: true, ...result }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to toggle like" }
  }
}

/** Interest ids for the current user (same as former GET /api/user-interests). */
export async function getMyInterestIdsAction(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return []

  return getUserInterestIdsUseCase(user.id, createUserInterestsSupabaseAdapter(createClient))
}

export type SetMyInterestsResult =
  | { success: true }
  | { success: false; error: string }

/** Replace the current user's interest selections (same as former PUT /api/user-interests). */
export async function setMyInterestsAction(interestIds: string[]): Promise<SetMyInterestsResult> {
  const parsed = interestIdsBodySchema.safeParse({ interestIds })
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }
  const ids = parsed.data.interestIds

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    await setUserInterestsUseCase(user.id, ids, createUserInterestsSupabaseAdapter(createClient))
    updateTag(`user-profile-${user.id}`)
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to set interests" }
  }
}
