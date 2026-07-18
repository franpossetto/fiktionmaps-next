import { validateImageFile } from "@/lib/asset-images/image-variant-service"
import { uploadPendingContributionImage } from "@/lib/asset-images/pending-contribution-image"
import { approveContributionUseCase } from "@/src/contributions/application/approve-contribution.usecase"
import {
  FICTION_BANNER_ASSET_ROLE,
  FICTION_COVER_ASSET_ROLE,
} from "@/src/contributions/domain/contribution.config"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

export type FictionAddPhotoTargetRole = typeof FICTION_COVER_ASSET_ROLE | typeof FICTION_BANNER_ASSET_ROLE

export type SubmitFictionAddPhotoContributionInput = {
  userId: string
  fictionId: string
  targetRole: FictionAddPhotoTargetRole
  file: File
  autoApprove: boolean
}

export type SubmitFictionAddPhotoContributionResult =
  | { success: true; contributionId: string; autoApproved: boolean; previewUrl: string }
  | { success: false; error: string }

export async function submitFictionAddPhotoContributionUseCase(
  input: SubmitFictionAddPhotoContributionInput,
  contributionsRepo: ContributionsRepositoryPort,
  fictionsRepo: FictionsRepositoryPort,
): Promise<SubmitFictionAddPhotoContributionResult> {
  const validationError = validateImageFile(input.file)
  if (validationError) return { success: false, error: validationError }

  const eligible = await fictionsRepo.isApprovedActiveFiction(input.fictionId)
  if (!eligible) {
    return {
      success: false,
      error: "Fiction not found or not available for photo contributions",
    }
  }

  const pendingCount = await contributionsRepo.countPendingAddPhotoByFictionAndRole(
    input.fictionId,
    input.targetRole,
  )
  if (pendingCount > 0) {
    return {
      success: false,
      error: "This fiction already has a pending photo contribution for this image type",
    }
  }

  const created = await contributionsRepo.create({
    userId: input.userId,
    type: "add_photo",
    entityType: "fiction",
    entityId: input.fictionId,
  })
  if (!created) return { success: false, error: "Failed to create contribution" }

  if (input.targetRole === FICTION_COVER_ASSET_ROLE) {
    const uploaded = await uploadPendingContributionImage(
      created.contributionId,
      FICTION_COVER_ASSET_ROLE,
      input.file,
    )
    if (!uploaded.success) {
      return { success: false, error: uploaded.error }
    }

    const xs = uploaded.paths.xs
    const sm = uploaded.paths.sm
    const lg = uploaded.paths.lg
    if (!sm || !lg) {
      return { success: false, error: "Failed to save pending cover variants" }
    }

    const linked = await contributionsRepo.insertPendingContributionImages({
      contributionId: created.contributionId,
      role: FICTION_COVER_ASSET_ROLE,
      paths: { xs, sm, lg },
    })
    if (!linked) {
      return { success: false, error: "Failed to save pending cover" }
    }

    if (input.autoApprove) {
      const approved = await approveContributionUseCase(
        { id: created.contributionId, moderatorId: input.userId },
        contributionsRepo,
      )
      return {
        success: true,
        contributionId: created.contributionId,
        autoApproved: approved,
        previewUrl: uploaded.previewUrl,
      }
    }

    return {
      success: true,
      contributionId: created.contributionId,
      autoApproved: false,
      previewUrl: uploaded.previewUrl,
    }
  }

  const uploaded = await uploadPendingContributionImage(
    created.contributionId,
    FICTION_BANNER_ASSET_ROLE,
    input.file,
    ["lg"],
  )
  if (!uploaded.success) {
    return { success: false, error: uploaded.error }
  }

  const lg = uploaded.paths.lg
  if (!lg) {
    return { success: false, error: "Failed to save pending hero variant" }
  }

  const linked = await contributionsRepo.insertPendingContributionImages({
    contributionId: created.contributionId,
    role: FICTION_BANNER_ASSET_ROLE,
    paths: { lg },
  })
  if (!linked) {
    return { success: false, error: "Failed to save pending hero" }
  }

  if (input.autoApprove) {
    const approved = await approveContributionUseCase(
      { id: created.contributionId, moderatorId: input.userId },
      contributionsRepo,
    )
    return {
      success: true,
      contributionId: created.contributionId,
      autoApproved: approved,
      previewUrl: uploaded.previewUrl,
    }
  }

  return {
    success: true,
    contributionId: created.contributionId,
    autoApproved: false,
    previewUrl: uploaded.previewUrl,
  }
}
