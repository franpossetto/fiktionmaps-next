import type { HuntsRepositoryPort } from "@/src/hunts/domain/hunt.repository"
import type { HuntSourcesRepositoryPort } from "@/src/hunts/domain/hunt-source.repository"
import {
  canPostulateCandidate,
  countHuntCandidateStats,
} from "@/src/hunts/domain/hunt-candidate.helpers"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"

export interface MarkHuntCandidatePostedInput {
  huntId: string
  placeIndex: number
  placeId: string
}

export async function markHuntCandidatePostedUseCase(
  input: MarkHuntCandidatePostedInput,
  userId: string,
  huntsRepo: HuntsRepositoryPort,
  huntSourcesRepo: HuntSourcesRepositoryPort,
): Promise<Hunt> {
  const hunt = await huntsRepo.getById(input.huntId)
  if (!hunt) throw new Error("Hunt not found")
  if (hunt.createdBy !== userId) throw new Error("Forbidden")
  if (hunt.status !== "submitted") {
    throw new Error("This hunt is not ready for posting candidates")
  }

  const source = await huntSourcesRepo.getById(hunt.huntSourceId)
  if (!source?.fictionId) throw new Error("Hunt source has no fiction assigned")

  const places = [...hunt.payload.places]
  const reviewed = places[input.placeIndex]
  if (!reviewed) throw new Error("Candidate not found")
  if (!canPostulateCandidate(reviewed)) {
    throw new Error("This candidate cannot be posted")
  }

  places[input.placeIndex] = {
    ...reviewed,
    posted_place_id: input.placeId,
  }

  const counts = countHuntCandidateStats(places)
  const ok = await huntsRepo.updatePayloadAndStatus(
    input.huntId,
    { places },
    hunt.status,
    {
      ...hunt.stats,
      extracted: counts.extracted,
      approved: counts.shortlisted,
      skipped: counts.skipped,
      posted: counts.posted,
    },
    hunt.hunterNote,
  )
  if (!ok) throw new Error("Failed to update hunt")

  const updated = await huntsRepo.getById(input.huntId)
  if (!updated) throw new Error("Failed to reload hunt")
  return updated
}
