import type { HuntSourcesRepositoryPort } from "@/src/hunts/domain/hunt-source.repository"
import type { HuntsRepositoryPort } from "@/src/hunts/domain/hunt.repository"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { HuntPlaceReviewed } from "@/src/hunts/domain/hunt.types"
import { effectivePlace } from "@/src/hunts/domain/hunt-place.helpers"
import { findDuplicate } from "./find-duplicate"

export interface AssignFictionToHuntSourceInput {
  sourceId: string
  fictionId: string
  huntId: string
}

export interface AssignFictionToHuntSourceResult {
  fictionTitle: string
  places: HuntPlaceReviewed[]
}

function refreshPlaceDuplicates(
  places: HuntPlaceReviewed[],
  existingPlaces: Awaited<ReturnType<PlacesRepositoryPort["getByFictionId"]>>,
): HuntPlaceReviewed[] {
  return places.map((reviewed) => ({
    ...reviewed,
    extracted: {
      ...reviewed.extracted,
      duplicate_of: findDuplicate(effectivePlace(reviewed), existingPlaces),
    },
  }))
}

export async function assignFictionToHuntSourceUseCase(
  input: AssignFictionToHuntSourceInput,
  userId: string,
  huntSourcesRepo: HuntSourcesRepositoryPort,
  huntsRepo: HuntsRepositoryPort,
  placesRepo: PlacesRepositoryPort,
  fictionsRepo: FictionsRepositoryPort,
): Promise<AssignFictionToHuntSourceResult> {
  const source = await huntSourcesRepo.getById(input.sourceId)
  if (!source) throw new Error("Hunt source not found")
  if (source.createdBy !== userId) throw new Error("Forbidden")

  const fiction = await fictionsRepo.getById(input.fictionId)
  if (!fiction) throw new Error("Fiction not found")

  const hunt = await huntsRepo.getById(input.huntId)
  if (!hunt) throw new Error("Hunt not found")
  if (hunt.createdBy !== userId) throw new Error("Forbidden")
  if (hunt.huntSourceId !== source.id) throw new Error("Hunt does not belong to this source")
  if (hunt.status === "submitted" || hunt.status === "approved" || hunt.status === "rejected") {
    throw new Error("This hunt can no longer be edited")
  }

  const ok = await huntSourcesRepo.updateFictionId(source.id, fiction.id)
  if (!ok) throw new Error("Failed to assign fiction")

  const existingPlaces = await placesRepo.getByFictionId(fiction.id)
  const places = refreshPlaceDuplicates(hunt.payload.places, existingPlaces)

  const saved = await huntsRepo.updatePayload(hunt.id, { places })
  if (!saved) throw new Error("Failed to refresh hunt duplicates")

  return { fictionTitle: fiction.title, places }
}
