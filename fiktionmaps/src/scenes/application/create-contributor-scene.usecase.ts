import { createContributionUseCase } from "@/src/contributions/application/create-contribution.usecase"
import type { EntityContributionRowStatus } from "@/src/contributions/application/resolve-entity-contribution-insert-defaults.usecase"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { PlacesRepositoryPort } from "@/src/places/domain/place.repository"
import { createSceneUseCase } from "@/src/scenes/application/create-scene.usecase"
import { linkScenePlaceUseCase } from "@/src/scenes/application/link-scene-place.usecase"
import type { ScenesRepositoryPort } from "@/src/scenes/domain/scene.repository"

export type CreateContributorSceneInput = {
  userId: string
  status: EntityContributionRowStatus
  autoApproveContribution: boolean
  fictionId: string
  placeIds: string[]
  title: string
  description: string
  videoUrl: string
  previewUrl: string
  quote?: string | null
  timestampLabel?: string | null
  season?: number | null
  episode?: number | null
  episodeTitle?: string | null
}

export type CreateContributorSceneUseCaseResult =
  | {
      success: true
      sceneId: string
      fictionId: string
      placeIds: string[]
      contributionAutoApproved?: boolean
    }
  | { success: false; error: string }

interface Deps {
  scenesRepo: Pick<ScenesRepositoryPort, "create" | "getById" | "linkPlace" | "delete">
  placesRepo: Pick<PlacesRepositoryPort, "getByIds" | "isApprovedActivePlace">
  contributionsRepo: ContributionsRepositoryPort
  getFictionType: (fictionId: string) => Promise<string | null>
}

export async function createContributorSceneUseCase(
  input: CreateContributorSceneInput,
  deps: Deps,
): Promise<CreateContributorSceneUseCaseResult> {
  const placeIds = [...new Set(input.placeIds.filter(Boolean))]
  if (placeIds.length === 0) {
    return { success: false, error: "Select at least one place" }
  }

  const places = await deps.placesRepo.getByIds(placeIds)
  if (places.length !== placeIds.length) {
    return { success: false, error: "One or more places were not found" }
  }

  for (const place of places) {
    const ok = await deps.placesRepo.isApprovedActivePlace(place.id)
    if (!ok) {
      return { success: false, error: "Place not found or not available for scene contributions" }
    }
    if (place.fictionId !== input.fictionId) {
      return { success: false, error: "Place must belong to the same fiction as the scene" }
    }
  }

  let scene
  try {
    scene = await createSceneUseCase(
      {
        fictionId: input.fictionId,
        title: input.title,
        description: input.description,
        videoUrl: input.videoUrl,
        previewUrl: input.previewUrl,
        quote: input.quote ?? null,
        timestampLabel: input.timestampLabel ?? null,
        season: input.season ?? null,
        episode: input.episode ?? null,
        episodeTitle: input.episodeTitle ?? null,
        sortOrder: 0,
        active: false,
      },
      { userId: input.userId, status: input.status },
      {
        scenesRepo: deps.scenesRepo,
        getFictionType: deps.getFictionType,
      },
    )
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create scene" }
  }

  try {
    for (const placeId of placeIds) {
      await linkScenePlaceUseCase(
        {
          sceneId: scene.id,
          placeId,
          startSecond: null,
          endSecond: null,
        },
        { userId: input.userId },
        { scenesRepo: deps.scenesRepo },
      )
    }
  } catch (err) {
    await deps.scenesRepo.delete(scene.id)
    return { success: false, error: err instanceof Error ? err.message : "Failed to link place" }
  }

  let contributionAutoApproved: boolean | undefined
  try {
    const contribution = await createContributionUseCase(
      {
        userId: input.userId,
        type: "add_scene",
        entityType: "scene",
        entityId: scene.id,
      },
      deps.contributionsRepo,
      input.autoApproveContribution,
    )
    if (!contribution) {
      console.error("[createContributorSceneUseCase] createContributionUseCase failed", {
        sceneId: scene.id,
      })
    } else {
      contributionAutoApproved = contribution.autoApproved
    }
  } catch (err) {
    console.error("[createContributorSceneUseCase] createContributionUseCase threw", {
      sceneId: scene.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const out: CreateContributorSceneUseCaseResult = {
    success: true,
    sceneId: scene.id,
    fictionId: input.fictionId,
    placeIds,
  }
  if (typeof contributionAutoApproved === "boolean") {
    return { ...out, contributionAutoApproved }
  }
  return out
}
