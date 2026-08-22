import { validateImageFile } from "@/lib/asset-images/image-variant-service"
import { uploadPendingContributionImage } from "@/lib/asset-images/pending-contribution-image"
import { approveContributionUseCase } from "@/src/contributions/application/approve-contribution.usecase"
import { replacePendingAddPhotoImagesUseCase } from "@/src/contributions/application/replace-pending-add-photo-images.usecase"
import { PLACE_PHOTO_ASSET_ROLE } from "@/src/contributions/domain/contribution.config"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"

export type SubmitPlaceAddPhotoContributionInput = {
  userId: string
  placeId: string
  imageFile: File
  autoApprove: boolean
  focus?: { x: number; y: number }
}

export type SubmitPlaceAddPhotoContributionResult =
  | { success: true; contributionId: string; autoApproved: boolean; previewUrl: string }
  | { success: false; error: string }

export async function submitPlaceAddPhotoContributionUseCase(
  input: SubmitPlaceAddPhotoContributionInput,
  contributionsRepo: ContributionsRepositoryPort,
  placesRepo: PlacesRepositoryPort,
): Promise<SubmitPlaceAddPhotoContributionResult> {
  const validationError = validateImageFile(input.imageFile)
  if (validationError) return { success: false, error: validationError }

  const eligible = await placesRepo.isApprovedActivePlace(input.placeId)
  if (!eligible) {
    return { success: false, error: "Place not found or not available for photo contributions" }
  }

  const ownPending = await contributionsRepo.findPendingAddPhotoByPlaceAndUser(
    input.placeId,
    input.userId,
  )

  if (ownPending) {
    const replaced = await replacePendingAddPhotoImagesUseCase(
      {
        contributionId: ownPending.contributionId,
        role: PLACE_PHOTO_ASSET_ROLE,
        file: input.imageFile,
        focus: input.focus,
      },
      contributionsRepo,
    )
    if (!replaced.success) return replaced

    if (input.autoApprove) {
      const approved = await approveContributionUseCase(
        { id: ownPending.contributionId, moderatorId: input.userId },
        contributionsRepo,
      )
      return {
        success: true,
        contributionId: ownPending.contributionId,
        autoApproved: approved,
        previewUrl: replaced.previewUrl,
      }
    }

    return {
      success: true,
      contributionId: ownPending.contributionId,
      autoApproved: false,
      previewUrl: replaced.previewUrl,
    }
  }

  const pendingCount = await contributionsRepo.countPendingAddPhotoByPlace(input.placeId)
  if (pendingCount > 0) {
    return { success: false, error: "This place already has a photo contribution pending review" }
  }

  const created = await contributionsRepo.create({
    userId: input.userId,
    type: "add_photo",
    entityType: "place",
    entityId: input.placeId,
  })
  if (!created) return { success: false, error: "Failed to create contribution" }

  const uploaded = await uploadPendingContributionImage(
    created.contributionId,
    PLACE_PHOTO_ASSET_ROLE,
    input.imageFile,
  )
  if (!uploaded.success) {
    return { success: false, error: uploaded.error }
  }

  const xsPath = uploaded.paths.xs
  const smPath = uploaded.paths.sm
  const lgPath = uploaded.paths.lg
  const xlPath = uploaded.paths.xl
  if (!smPath || !lgPath || !xlPath) {
    return { success: false, error: "Failed to save pending photo variants" }
  }

  const linked = await contributionsRepo.insertPendingContributionImages({
    contributionId: created.contributionId,
    role: PLACE_PHOTO_ASSET_ROLE,
    paths: { xs: xsPath, sm: smPath, lg: lgPath, xl: xlPath },
    focus: input.focus,
  })
  if (!linked) {
    return { success: false, error: "Failed to save pending photo" }
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
