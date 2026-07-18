import type { HuntSourcesRepositoryPort } from "@/src/hunts/domain/hunt-source.repository"
import type { HuntsRepositoryPort } from "@/src/hunts/domain/hunt.repository"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"
import type { HuntPlaceReviewed } from "@/src/hunts/domain/hunt.types"

export interface FinishHuntReviewInput {
  huntId: string
  places: HuntPlaceReviewed[]
  hunterNote?: string | null
}

export async function finishHuntReviewUseCase(
  input: FinishHuntReviewInput,
  userId: string,
  huntsRepo: HuntsRepositoryPort,
  huntSourcesRepo: HuntSourcesRepositoryPort,
): Promise<Hunt> {
  const hunt = await huntsRepo.getById(input.huntId)
  if (!hunt) throw new Error("Hunt not found")
  if (hunt.createdBy !== userId) throw new Error("Forbidden")

  const source = await huntSourcesRepo.getById(hunt.huntSourceId)
  if (!source) throw new Error("Hunt source not found")
  if (!source.fictionId) {
    throw new Error("Assign a fiction to this hunt source before finishing")
  }

  const approved = input.places.filter((p) => p.review_decision === "approved").length
  const skipped = input.places.filter(
    (p) => p.review_decision && p.review_decision !== "approved",
  ).length

  if (approved === 0 && !input.hunterNote?.trim()) {
    throw new Error("A note is required when no places are approved")
  }

  const stats = {
    extracted: input.places.length,
    approved,
    skipped,
    posted: input.places.filter((p) => p.posted_place_id).length,
  }

  const ok = await huntsRepo.updatePayloadAndStatus(
    input.huntId,
    { places: input.places },
    "submitted",
    stats,
    input.hunterNote ?? null,
  )

  if (!ok) throw new Error("Failed to save review")

  const updated = await huntsRepo.getById(input.huntId)
  if (!updated) throw new Error("Failed to reload hunt after save")

  return updated
}
