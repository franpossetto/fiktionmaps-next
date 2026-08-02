import {
  removePendingContributionStoragePaths,
  uploadPendingContributionImage,
  type PendingContributionImageRole,
} from "@/lib/asset-images/pending-contribution-image"
import type { ImageVariant } from "@/lib/asset-images/variant-sizes"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"

export type ReplacePendingAddPhotoImagesInput = {
  contributionId: string
  role: PendingContributionImageRole
  file: File
  variants?: readonly ImageVariant[]
  focus?: { x: number; y: number }
}

export type ReplacePendingAddPhotoImagesResult =
  | { success: true; previewUrl: string }
  | { success: false; error: string }

/** Clears staged pending images for a contribution and uploads a new set. */
export async function replacePendingAddPhotoImagesUseCase(
  input: ReplacePendingAddPhotoImagesInput,
  contributionsRepo: ContributionsRepositoryPort,
): Promise<ReplacePendingAddPhotoImagesResult> {
  const uploaded = await uploadPendingContributionImage(
    input.contributionId,
    input.role,
    input.file,
    input.variants,
  )
  if (!uploaded.success) {
    return { success: false, error: uploaded.error }
  }

  // contribution_pending_images is UNIQUE (contribution_id, role, variant), so the old rows
  // must go before the new ones land. Uploaded paths are version-stamped and never collide.
  const oldPaths = await contributionsRepo.deletePendingImagesByContributionId(input.contributionId)

  const linked = await contributionsRepo.insertPendingContributionImages({
    contributionId: input.contributionId,
    role: input.role,
    paths: uploaded.paths,
    focus: input.focus,
  })
  if (!linked) {
    return { success: false, error: "Failed to save pending photo" }
  }

  await removePendingContributionStoragePaths(oldPaths)

  return { success: true, previewUrl: uploaded.previewUrl }
}
