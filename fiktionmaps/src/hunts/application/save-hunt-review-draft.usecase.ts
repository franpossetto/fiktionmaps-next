import type { HuntsRepositoryPort } from "@/src/hunts/domain/hunt.repository"
import type { HuntPlaceReviewed } from "@/src/hunts/domain/hunt.types"

export interface SaveHuntReviewDraftInput {
  huntId: string
  places: HuntPlaceReviewed[]
  hunterNote?: string | null
}

export async function saveHuntReviewDraftUseCase(
  input: SaveHuntReviewDraftInput,
  userId: string,
  huntsRepo: HuntsRepositoryPort,
): Promise<void> {
  const hunt = await huntsRepo.getById(input.huntId)
  if (!hunt) throw new Error("Hunt not found")
  if (hunt.createdBy !== userId) throw new Error("Forbidden")
  if (hunt.status === "submitted" || hunt.status === "approved" || hunt.status === "rejected") {
    throw new Error("This hunt review can no longer be edited")
  }

  const ok = await huntsRepo.updateReviewDraft(
    input.huntId,
    { places: input.places },
    input.hunterNote ?? null,
  )
  if (!ok) throw new Error("Failed to save draft")
}
