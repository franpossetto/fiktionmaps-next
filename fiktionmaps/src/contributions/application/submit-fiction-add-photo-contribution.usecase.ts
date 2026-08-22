import { validateImageFile } from "@/lib/asset-images/image-variant-service"
import { uploadPendingContributionImage } from "@/lib/asset-images/pending-contribution-image"
import { BANNER_UPLOAD_VARIANTS } from "@/lib/asset-images/variant-sizes"
import { approveContributionUseCase } from "@/src/contributions/application/approve-contribution.usecase"
import { replacePendingAddPhotoImagesUseCase } from "@/src/contributions/application/replace-pending-add-photo-images.usecase"
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
  focus?: { x: number; y: number }
}

export type SubmitFictionAddPhotoContributionResult =
  | { success: true; contributionId: string; autoApproved: boolean; previewUrl: string }
  | { success: false; error: string }

async function finalizeFictionAddPhoto(
  contributionId: string,
  previewUrl: string,
  userId: string,
  autoApprove: boolean,
  contributionsRepo: ContributionsRepositoryPort,
): Promise<SubmitFictionAddPhotoContributionResult> {
  if (!autoApprove) {
    return {
      success: true,
      contributionId,
      autoApproved: false,
      previewUrl,
    }
  }

  const approved = await approveContributionUseCase(
    { id: contributionId, moderatorId: userId },
    contributionsRepo,
  )
  return {
    success: true,
    contributionId,
    autoApproved: approved,
    previewUrl,
  }
}

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

  const ownPending = await contributionsRepo.findPendingAddPhotoByFictionRoleAndUser(
    input.fictionId,
    input.targetRole,
    input.userId,
  )

  if (ownPending) {
    const replaced = await replacePendingAddPhotoImagesUseCase(
      {
        contributionId: ownPending.contributionId,
        role: input.targetRole,
        file: input.file,
        variants:
          input.targetRole === FICTION_BANNER_ASSET_ROLE ? BANNER_UPLOAD_VARIANTS : undefined,
        focus: input.focus,
      },
      contributionsRepo,
    )
    if (!replaced.success) return replaced

    return finalizeFictionAddPhoto(
      ownPending.contributionId,
      replaced.previewUrl,
      input.userId,
      input.autoApprove,
      contributionsRepo,
    )
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
    const xl = uploaded.paths.xl
    if (!sm || !lg || !xl) {
      return { success: false, error: "Failed to save pending cover variants" }
    }

    const linked = await contributionsRepo.insertPendingContributionImages({
      contributionId: created.contributionId,
      role: FICTION_COVER_ASSET_ROLE,
      paths: { xs, sm, lg, xl },
      focus: input.focus,
    })
    if (!linked) {
      return { success: false, error: "Failed to save pending cover" }
    }

    return finalizeFictionAddPhoto(
      created.contributionId,
      uploaded.previewUrl,
      input.userId,
      input.autoApprove,
      contributionsRepo,
    )
  }

  const uploaded = await uploadPendingContributionImage(
    created.contributionId,
    FICTION_BANNER_ASSET_ROLE,
    input.file,
    BANNER_UPLOAD_VARIANTS,
  )
  if (!uploaded.success) {
    return { success: false, error: uploaded.error }
  }

  const lg = uploaded.paths.lg
  const xl = uploaded.paths.xl
  if (!lg || !xl) {
    return { success: false, error: "Failed to save pending hero variants" }
  }

  const linked = await contributionsRepo.insertPendingContributionImages({
    contributionId: created.contributionId,
    role: FICTION_BANNER_ASSET_ROLE,
    paths: { lg, xl },
    focus: input.focus,
  })
  if (!linked) {
    return { success: false, error: "Failed to save pending hero" }
  }

  return finalizeFictionAddPhoto(
    created.contributionId,
    uploaded.previewUrl,
    input.userId,
    input.autoApprove,
    contributionsRepo,
  )
}
