import type { HuntSourcesRepositoryPort } from "@/src/hunts/domain/hunt-source.repository"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"
import type { HuntSource } from "@/src/hunts/domain/hunt-source.entity"

export interface AddHuntSourceInput {
  fictionId: string | null
  contextLabel: string | null
  sourceUrl: string
  researchNote?: string
}

export async function addHuntSourceUseCase(
  input: AddHuntSourceInput,
  userId: string,
  fictionsRepo: FictionsRepositoryPort,
  huntSourcesRepo: HuntSourcesRepositoryPort,
): Promise<HuntSource> {
  // Exactly one of fictionId or contextLabel must be set
  if (!input.fictionId && !input.contextLabel?.trim()) {
    throw new Error("Either a fiction or a context label is required")
  }

  if (input.fictionId) {
    const fiction = await fictionsRepo.getById(input.fictionId)
    if (!fiction) throw new Error("Fiction not found")
  }

  const created = await huntSourcesRepo.create({
    fictionId: input.fictionId ?? null,
    contextLabel: input.contextLabel?.trim() ?? null,
    sourceUrl: input.sourceUrl.trim(),
    researchNote: input.researchNote,
    createdBy: userId,
  })

  if (!created) throw new Error("Failed to add source — it may already exist for this fiction")

  return created
}
