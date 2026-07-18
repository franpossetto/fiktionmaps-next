import type { City } from "@/src/cities/domain/city.entity"
import type { HuntsRepositoryPort } from "@/src/hunts/domain/hunt.repository"
import type { HuntSourcesRepositoryPort } from "@/src/hunts/domain/hunt-source.repository"
import {
  buildHuntPlaceContributePrefill,
  type HuntPlaceContributePrefill,
} from "@/src/hunts/domain/hunt-candidate.helpers"

export async function getHuntPlaceContributePrefillUseCase(
  huntId: string,
  placeIndex: number,
  userId: string,
  huntsRepo: HuntsRepositoryPort,
  huntSourcesRepo: HuntSourcesRepositoryPort,
  cities: City[],
): Promise<HuntPlaceContributePrefill> {
  const hunt = await huntsRepo.getById(huntId)
  if (!hunt) throw new Error("Hunt not found")
  if (hunt.createdBy !== userId) throw new Error("Forbidden")
  if (hunt.status !== "submitted") throw new Error("This hunt is not ready for posting")

  const source = await huntSourcesRepo.getById(hunt.huntSourceId)
  if (!source?.fictionId) throw new Error("Assign a fiction before posting candidates")

  const reviewed = hunt.payload.places[placeIndex]
  if (!reviewed) throw new Error("Candidate not found")

  const prefill = buildHuntPlaceContributePrefill(
    huntId,
    placeIndex,
    reviewed,
    source.fictionId,
    cities,
  )
  if (!prefill) throw new Error("This candidate cannot be posted")

  return prefill
}
