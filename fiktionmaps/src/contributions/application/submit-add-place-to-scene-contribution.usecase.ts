import { approveContributionUseCase } from "@/src/contributions/application/approve-contribution.usecase"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"

export type SubmitAddPlaceToSceneContributionInput = {
  userId: string
  sceneId: string
  placeIds: string[]
  autoApprove: boolean
}

export type SubmitAddPlaceToSceneContributionResult =
  | { success: true; contributionIds: string[]; autoApproved: boolean }
  | { success: false; error: string }

interface Deps {
  contributionsRepo: ContributionsRepositoryPort
  scenesRepo: Pick<ScenesRepositoryPort, "getById" | "isApprovedActiveScene">
  placesRepo: Pick<PlacesRepositoryPort, "getById" | "isApprovedActivePlace" | "getByIds">
}

export async function submitAddPlaceToSceneContributionUseCase(
  input: SubmitAddPlaceToSceneContributionInput,
  deps: Deps,
): Promise<SubmitAddPlaceToSceneContributionResult> {
  const placeIds = [...new Set(input.placeIds.filter(Boolean))]
  if (placeIds.length === 0) {
    return { success: false, error: "Select at least one place" }
  }

  const sceneOk = await deps.scenesRepo.isApprovedActiveScene(input.sceneId)
  if (!sceneOk) {
    return { success: false, error: "Scene not found or not available for place contributions" }
  }

  const scene = await deps.scenesRepo.getById(input.sceneId)
  if (!scene) {
    return { success: false, error: "Scene not found" }
  }

  const places = await deps.placesRepo.getByIds(placeIds)
  if (places.length !== placeIds.length) {
    return { success: false, error: "One or more places were not found" }
  }

  const linked = new Set(scene.places.map((p) => p.placeId))
  for (const place of places) {
    const ok = await deps.placesRepo.isApprovedActivePlace(place.id)
    if (!ok) {
      return { success: false, error: "Place not found or not available for scene contributions" }
    }
    if (place.fictionId !== scene.fictionId) {
      return { success: false, error: "Place must belong to the same fiction as the scene" }
    }
    if (linked.has(place.id)) {
      return { success: false, error: "This place is already linked to this scene" }
    }
  }

  for (const placeId of placeIds) {
    const pendingCount = await deps.contributionsRepo.countPendingAddPlaceToScene(
      input.sceneId,
      placeId,
    )
    if (pendingCount > 0) {
      return {
        success: false,
        error: "This scene already has a pending place contribution for that location",
      }
    }
  }

  const contributionIds: string[] = []
  for (const placeId of placeIds) {
    const created = await deps.contributionsRepo.create({
      userId: input.userId,
      type: "add_place_to_scene",
      entityType: "scene",
      entityId: input.sceneId,
    })
    if (!created) return { success: false, error: "Failed to create contribution" }

    const staged = await deps.contributionsRepo.insertPendingScenePlace({
      contributionId: created.contributionId,
      placeId,
      startSecond: null,
      endSecond: null,
    })
    if (!staged) {
      return { success: false, error: "Failed to save proposed place link" }
    }
    contributionIds.push(created.contributionId)
  }

  if (input.autoApprove) {
    let allApproved = true
    for (const contributionId of contributionIds) {
      const approved = await approveContributionUseCase(
        { id: contributionId, moderatorId: input.userId },
        deps.contributionsRepo,
      )
      if (!approved) allApproved = false
    }
    return {
      success: true,
      contributionIds,
      autoApproved: allApproved,
    }
  }

  return {
    success: true,
    contributionIds,
    autoApproved: false,
  }
}
