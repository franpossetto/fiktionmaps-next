"use server"

import { revalidatePath, updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { uuidSchema } from "@/lib/validation/primitives"
import { zodErrorMessage } from "@/lib/validation/http"
import type { ContributorProfileWithDate } from "@/src/contributions/domain/contribution.entity"
import { getFictionScopeContributorContributionsUseCase } from "@/src/contributions/application/get-fiction-scope-contributor-contributions.usecase"
import { getContributorEntityScopeCountsUseCase } from "@/src/contributions/application/get-contributor-entity-scope-counts.usecase"
import { getPlaceContributorsWithDatesCached } from "@/src/contributions/infrastructure/next/contribution.queries"
import { approveContributionUseCase } from "@/src/contributions/application/approve-contribution.usecase"
import { createContributionUseCase } from "@/src/contributions/application/create-contribution.usecase"
import { ensureUserIsModeratorUseCase } from "@/src/contributions/application/ensure-user-is-moderator.usecase"
import { getContributionByIdUseCase } from "@/src/contributions/application/get-contribution-by-id.usecase"
import { rejectContributionUseCase } from "@/src/contributions/application/reject-contribution.usecase"
import { parseImageFocusFromFormData } from "@/lib/asset-images/image-focus"
import { submitPlaceAddPhotoContributionUseCase } from "@/src/contributions/application/submit-place-add-photo-contribution.usecase"
import { submitFictionAddPhotoContributionUseCase } from "@/src/contributions/application/submit-fiction-add-photo-contribution.usecase"
import { MODERATOR_ROLES } from "@/src/contributions/domain/contribution.config"
import type { ContributionEntityType } from "@/src/contributions/domain/contribution.entity"
import {
  approveContributionSchema,
  createContributionSchema,
  rejectContributionSchema,
  submitPlaceAddPhotoContributionSchema,
  submitFictionAddPhotoContributionSchema,
} from "@/src/contributions/domain/contribution.schemas"
import { supabaseRepositoryAdapter as placesRepo } from "@/src/places/infrastructure/supabase/place.repository.impl"
import { supabaseRepositoryAdapter as fictionsRepo } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { supabaseRepositoryAdapter as contributionsRepo } from "@/src/contributions/infrastructure/supabase/contribution.repository.impl"
import { profilesReaderSupabaseAdapter } from "@/src/contributions/infrastructure/supabase/profiles-reader.supabase"
import type {
  ApproveContributionResult,
  CreateContributionResult,
  RejectContributionResult,
  GetFictionScopeContributorContributionsResult,
} from "./contribution.actions.types"
import type { ApproveContributionData, CreateContributionData, RejectContributionData } from "@/src/contributions/domain/contribution.schemas"

export type {
  ApproveContributionResult,
  CreateContributionResult,
  RejectContributionResult,
  GetFictionScopeContributorContributionsResult,
} from "./contribution.actions.types"

export async function getPlaceContributorsAction(
  placeId: string,
): Promise<ContributorProfileWithDate[]> {
  if (!uuidSchema.safeParse(placeId).success) return []
  return getPlaceContributorsWithDatesCached(placeId)
}

async function revalidateContributionEntityTags(entityType: ContributionEntityType, entityId: string) {
  switch (entityType) {
    case "fiction":
      updateTag("fictions")
      updateTag(`fiction-${entityId}`)
      break
    case "place": {
      updateTag("places")
      updateTag(`place-${entityId}`)
      const place = await placesRepo.getById(entityId)
      if (place?.fictionId) {
        updateTag("fictions")
        updateTag(`fiction-${place.fictionId}`)
      }
      break
    }
    case "scene":
      updateTag("scenes")
      updateTag(`scene-${entityId}`)
      break
    default: {
      const _exhaustive: never = entityType
      void _exhaustive
    }
  }
}

export async function createContributionAction(data: CreateContributionData): Promise<CreateContributionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = createContributionSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const autoApprove = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )

  const result = await createContributionUseCase(
    { ...parsed.data, userId: user.id },
    contributionsRepo,
    autoApprove,
  )
  if (!result) return { success: false, error: "Failed to create contribution" }

  revalidatePath("/admin")
  revalidatePath("/contributions")
  updateTag("contributions")
  await revalidateContributionEntityTags(parsed.data.entityType, parsed.data.entityId)
  if (result.autoApproved) {
    updateTag("profiles")
  }
  return { success: true, contributionId: result.contributionId, autoApproved: result.autoApproved }
}

export type SubmitPlaceAddPhotoContributionResult =
  | { success: true; contributionId: string; autoApproved: boolean; previewUrl: string }
  | { success: false; error: string }

export async function submitPlaceAddPhotoContributionAction(
  formData: FormData,
): Promise<SubmitPlaceAddPhotoContributionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const placeId = formData.get("placeId")
  const file = formData.get("imageFile")

  const parsed = submitPlaceAddPhotoContributionSchema.safeParse({
    placeId: typeof placeId === "string" ? placeId : "",
  })
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No image file provided" }
  }

  const autoApprove = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )

  const result = await submitPlaceAddPhotoContributionUseCase(
    {
      userId: user.id,
      placeId: parsed.data.placeId,
      imageFile: file,
      autoApprove,
      focus: parseImageFocusFromFormData(formData),
    },
    contributionsRepo,
    placesRepo,
  )

  if (!result.success) return result

  revalidatePath("/contributions")
  revalidatePath("/profile/contribute")
  updateTag("contributions")
  updateTag("places")
  updateTag(`place-${parsed.data.placeId}`)
  if (result.autoApproved) updateTag("profiles")

  return result
}

export type SubmitFictionAddPhotoContributionResult =
  | { success: true; contributionId: string; autoApproved: boolean; previewUrl: string }
  | { success: false; error: string }

export async function submitFictionAddPhotoContributionAction(
  formData: FormData,
): Promise<SubmitFictionAddPhotoContributionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const fictionId = formData.get("fictionId")
  const targetRole = formData.get("targetRole")
  const photoFile = formData.get("photoFile")

  const parsed = submitFictionAddPhotoContributionSchema.safeParse({
    fictionId: typeof fictionId === "string" ? fictionId : "",
    targetRole: typeof targetRole === "string" ? targetRole : "",
  })
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }
  if (!(photoFile instanceof File) || photoFile.size === 0) {
    return { success: false, error: "No image provided" }
  }

  const autoApprove = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )

  const result = await submitFictionAddPhotoContributionUseCase(
    {
      userId: user.id,
      fictionId: parsed.data.fictionId,
      targetRole: parsed.data.targetRole,
      file: photoFile,
      autoApprove,
      focus: parseImageFocusFromFormData(formData),
    },
    contributionsRepo,
    fictionsRepo,
  )

  if (!result.success) return result

  revalidatePath("/contributions")
  revalidatePath("/profile/contribute")
  updateTag("contributions")
  updateTag("fictions")
  updateTag(`fiction-${parsed.data.fictionId}`)
  if (result.autoApproved) updateTag("profiles")

  return result
}

export async function approveContributionAction(data: ApproveContributionData): Promise<ApproveContributionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const moderatorOk = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  if (!moderatorOk) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = approveContributionSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const contributionBefore = await getContributionByIdUseCase(parsed.data.id, contributionsRepo)
  if (!contributionBefore) return { success: false, error: "Contribution not found" }

  const ok = await approveContributionUseCase({ ...parsed.data, moderatorId: user.id }, contributionsRepo)
  if (!ok) return { success: false, error: "Approve failed or contribution is not pending" }

  revalidatePath("/admin")
  revalidatePath("/contributions")
  updateTag("contributions")
  updateTag("profiles")
  await revalidateContributionEntityTags(contributionBefore.entityType, contributionBefore.entityId)
  return { success: true }
}

export async function rejectContributionAction(data: RejectContributionData): Promise<RejectContributionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const moderatorOk = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  if (!moderatorOk) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = rejectContributionSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const contributionBefore = await getContributionByIdUseCase(parsed.data.id, contributionsRepo)
  if (!contributionBefore) return { success: false, error: "Contribution not found" }

  const ok = await rejectContributionUseCase({ ...parsed.data, moderatorId: user.id }, contributionsRepo)
  if (!ok) return { success: false, error: "Reject failed or contribution is not pending" }

  revalidatePath("/admin")
  revalidatePath("/contributions")
  updateTag("contributions")
  updateTag("profiles")
  await revalidateContributionEntityTags(contributionBefore.entityType, contributionBefore.entityId)
  return { success: true }
}

export async function getFictionScopeContributorContributionsAction(
  fictionId: string,
  userId: string,
): Promise<GetFictionScopeContributorContributionsResult> {
  if (!uuidSchema.safeParse(fictionId).success || !uuidSchema.safeParse(userId).success) {
    return { success: false, error: "Invalid id" }
  }

  try {
    const [items, scopeCounts] = await Promise.all([
      getFictionScopeContributorContributionsUseCase(fictionId, userId, contributionsRepo),
      getContributorEntityScopeCountsUseCase(userId, contributionsRepo),
    ])
    return { success: true, items, scopeCounts }
  } catch {
    return { success: false, error: "Failed to load contributor details" }
  }
}
