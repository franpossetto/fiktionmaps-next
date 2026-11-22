import { createContributionUseCase } from "@/src/contributions/application/create-contribution.usecase"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import { FICTION_EXTERNAL_ID_PROVIDER } from "@/src/fiction-external-ids/domain/fiction-external-id.entity"
import type { FictionExternalIdsRepositoryPort } from "@/src/fiction-external-ids/domain/fiction-external-ids.repository"
import { upsertFictionExternalIdUseCase } from "@/src/fiction-external-ids/application/upsert-fiction-external-id.usecase"
import { createFictionUseCase } from "@/src/fictions/application/create-fiction.usecase"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { CreateFictionData } from "@/src/fictions/domain/fiction.schemas"

export type CreateFictionWithMediaImage = {
  file: File
  focus: { x: number; y: number }
}

export type CreateFictionWithMediaInput = {
  userId: string
  autoApproveContribution: boolean
  data: CreateFictionData
  imdbId: string | null
  cover: CreateFictionWithMediaImage | null
  banner: CreateFictionWithMediaImage | null
}

export type CreateFictionWithMediaResult =
  | { success: true; fiction: FictionWithMedia; contributionAutoApproved?: boolean }
  | { success: false; error: string }

interface Deps {
  fictionsRepo: FictionsRepositoryPort
  fictionExternalIdsRepo: FictionExternalIdsRepositoryPort
  contributionsRepo: ContributionsRepositoryPort
  uploadFictionImage: (input: {
    fictionId: string
    role: "cover" | "banner"
    file: File
    focus: { x: number; y: number }
  }) => Promise<void>
}

export async function createFictionWithMediaUseCase(
  input: CreateFictionWithMediaInput,
  deps: Deps,
): Promise<CreateFictionWithMediaResult> {
  const fiction = await createFictionUseCase(input.data, deps.fictionsRepo)
  if (!fiction) return { success: false, error: "Failed to create fiction" }

  if (input.imdbId) {
    try {
      await upsertFictionExternalIdUseCase(
        fiction.id,
        FICTION_EXTERNAL_ID_PROVIDER.IMDB,
        input.imdbId,
        deps.fictionExternalIdsRepo,
      )
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Failed to save external id" }
    }
  }

  let contributionAutoApproved: boolean | undefined
  try {
    const contribution = await createContributionUseCase(
      {
        userId: input.userId,
        type: "create_fiction",
        entityType: "fiction",
        entityId: fiction.id,
      },
      deps.contributionsRepo,
      input.autoApproveContribution,
    )
    if (!contribution) {
      console.error("[createFictionWithMediaUseCase] createContributionUseCase failed", {
        fictionId: fiction.id,
      })
    } else {
      contributionAutoApproved = contribution.autoApproved
    }
  } catch (err) {
    console.error("[createFictionWithMediaUseCase] createContributionUseCase threw", {
      fictionId: fiction.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  if (input.cover) {
    await deps.uploadFictionImage({
      fictionId: fiction.id,
      role: "cover",
      file: input.cover.file,
      focus: input.cover.focus,
    })
  }
  if (input.banner) {
    await deps.uploadFictionImage({
      fictionId: fiction.id,
      role: "banner",
      file: input.banner.file,
      focus: input.banner.focus,
    })
  }

  if (typeof contributionAutoApproved === "boolean") {
    return { success: true, fiction, contributionAutoApproved }
  }
  return { success: true, fiction }
}
