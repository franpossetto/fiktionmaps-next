import { approveContributionUseCase } from "@/src/contributions/application/approve-contribution.usecase"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { SubmitLinkPlaceRelationshipContributionData } from "@/src/contributions/domain/contribution.schemas"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { PlaceRelationshipsRepositoryPort } from "@/src/place-relationships/domain/place-relationship.repository"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import { PLACE_RELATION_KIND_DEFAULT } from "@/src/places/domain/place-relation-kind"

export type SubmitLinkPlaceRelationshipContributionInput =
  SubmitLinkPlaceRelationshipContributionData & {
    userId: string
    autoApprove: boolean
  }

export type SubmitLinkPlaceRelationshipContributionResult =
  | { success: true; contributionId: string; autoApproved: boolean }
  | { success: false; error: string }

interface Deps {
  contributionsRepo: ContributionsRepositoryPort
  placesRepo: Pick<PlacesRepositoryPort, "getById" | "getByIds" | "isApprovedActivePlace">
  relationshipsRepo: Pick<PlaceRelationshipsRepositoryPort, "getMembership">
  fictionsRepo: Pick<FictionsRepositoryPort, "isApprovedActiveFiction">
}

export async function submitLinkPlaceRelationshipContributionUseCase(
  input: SubmitLinkPlaceRelationshipContributionInput,
  deps: Deps,
): Promise<SubmitLinkPlaceRelationshipContributionResult> {
  if (input.kind === "shared_clone") {
    return submitSharedClone(input, deps)
  }
  return submitComposite(input, deps)
}

async function submitSharedClone(
  input: Extract<SubmitLinkPlaceRelationshipContributionInput, { kind: "shared_clone" }>,
  deps: Deps,
): Promise<SubmitLinkPlaceRelationshipContributionResult> {
  const sourceOk = await deps.placesRepo.isApprovedActivePlace(input.sourcePlaceId)
  if (!sourceOk) {
    return { success: false, error: "Source place not found or not available" }
  }

  const source = await deps.placesRepo.getById(input.sourcePlaceId)
  if (!source) return { success: false, error: "Source place not found" }

  if (source.fictionId === input.targetFictionId) {
    return { success: false, error: "Target fiction must be different from the source place fiction" }
  }

  const fictionOk = await deps.fictionsRepo.isApprovedActiveFiction(input.targetFictionId)
  if (!fictionOk) {
    return { success: false, error: "Target fiction not found or not available" }
  }

  const pending = await deps.contributionsRepo.countPendingSharedClone(
    input.sourcePlaceId,
    input.targetFictionId,
  )
  if (pending > 0) {
    return {
      success: false,
      error: "A pending proposal already links this place to that fiction",
    }
  }

  const created = await deps.contributionsRepo.create({
    userId: input.userId,
    type: "link_place_relationship",
    entityType: "place",
    entityId: input.sourcePlaceId,
  })
  if (!created) return { success: false, error: "Failed to create contribution" }

  const staged = await deps.contributionsRepo.insertPendingPlaceRelationship({
    contributionId: created.contributionId,
    kind: "shared_clone",
    sourcePlaceId: input.sourcePlaceId,
    targetFictionId: input.targetFictionId,
    placeName: input.placeName,
    description: input.description,
    relationKind: input.relationKind ?? PLACE_RELATION_KIND_DEFAULT,
    shootEnvironment: input.shootEnvironment ?? null,
    relationshipName: input.relationshipName ?? input.placeName,
  })
  if (!staged) {
    return { success: false, error: "Failed to save proposed relationship" }
  }

  if (input.autoApprove) {
    const approved = await approveContributionUseCase(
      { id: created.contributionId, moderatorId: input.userId },
      deps.contributionsRepo,
    )
    return {
      success: true,
      contributionId: created.contributionId,
      autoApproved: approved,
    }
  }

  return {
    success: true,
    contributionId: created.contributionId,
    autoApproved: false,
  }
}

async function submitComposite(
  input: Extract<SubmitLinkPlaceRelationshipContributionInput, { kind: "composite" }>,
  deps: Deps,
): Promise<SubmitLinkPlaceRelationshipContributionResult> {
  if (input.placeAId === input.placeBId) {
    return { success: false, error: "Pick two different places" }
  }

  const places = await deps.placesRepo.getByIds([input.placeAId, input.placeBId])
  if (places.length !== 2) {
    return { success: false, error: "One or more places were not found" }
  }

  for (const place of places) {
    const ok = await deps.placesRepo.isApprovedActivePlace(place.id)
    if (!ok) {
      return { success: false, error: "Place not found or not available" }
    }
  }

  if (places[0]!.fictionId !== places[1]!.fictionId) {
    return { success: false, error: "Composite places must belong to the same fiction" }
  }

  for (const place of places) {
    const existing = await deps.relationshipsRepo.getMembership(place.id, "composite")
    if (existing) {
      return {
        success: false,
        error: "One of the places already belongs to a composite group",
      }
    }
  }

  const pending = await deps.contributionsRepo.countPendingComposite(
    input.placeAId,
    input.placeBId,
  )
  if (pending > 0) {
    return {
      success: false,
      error: "A pending proposal already links these places",
    }
  }

  const created = await deps.contributionsRepo.create({
    userId: input.userId,
    type: "link_place_relationship",
    entityType: "place",
    entityId: input.placeAId,
  })
  if (!created) return { success: false, error: "Failed to create contribution" }

  const staged = await deps.contributionsRepo.insertPendingPlaceRelationship({
    contributionId: created.contributionId,
    kind: "composite",
    placeAId: input.placeAId,
    placeBId: input.placeBId,
    groupName: input.groupName,
  })
  if (!staged) {
    return { success: false, error: "Failed to save proposed relationship" }
  }

  if (input.autoApprove) {
    const approved = await approveContributionUseCase(
      { id: created.contributionId, moderatorId: input.userId },
      deps.contributionsRepo,
    )
    return {
      success: true,
      contributionId: created.contributionId,
      autoApproved: approved,
    }
  }

  return {
    success: true,
    contributionId: created.contributionId,
    autoApproved: false,
  }
}
