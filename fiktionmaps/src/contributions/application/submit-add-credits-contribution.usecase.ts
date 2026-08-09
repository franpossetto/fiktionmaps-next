import { approveContributionUseCase } from "@/src/contributions/application/approve-contribution.usecase"
import type { ContributionsRepositoryPort } from "@/src/contributions/domain/contribution.repository"
import type { FictionPersonRole } from "@/src/persons/domain/person.entity"
import type { PersonsRepositoryPort } from "@/src/persons/domain/person.repository"
import type { FictionsRepositoryPort } from "@/src/fictions/domain/fiction.repository"

export type SubmitAddCreditsContributionInput = {
  userId: string
  fictionId: string
  role: FictionPersonRole
  personId?: string
  personName?: string
  autoApprove: boolean
}

export type SubmitAddCreditsContributionResult =
  | {
      success: true
      contributionId: string
      autoApproved: boolean
      personId: string
      /** True when a new `persons` row was created (photo upload allowed). */
      personWasCreated: boolean
    }
  | { success: false; error: string }

interface Deps {
  contributionsRepo: ContributionsRepositoryPort
  fictionsRepo: Pick<FictionsRepositoryPort, "isApprovedActiveFiction">
  personsRepo: PersonsRepositoryPort
}

export async function submitAddCreditsContributionUseCase(
  input: SubmitAddCreditsContributionInput,
  deps: Deps,
): Promise<SubmitAddCreditsContributionResult> {
  const fictionOk = await deps.fictionsRepo.isApprovedActiveFiction(input.fictionId)
  if (!fictionOk) {
    return { success: false, error: "Fiction not found or not available for credit contributions" }
  }

  let personId = input.personId?.trim() || null
  let personWasCreated = false

  if (personId) {
    const person = await deps.personsRepo.getById(personId)
    if (!person) {
      return { success: false, error: "Person not found" }
    }
  } else {
    const name = input.personName?.trim() ?? ""
    if (!name) {
      return { success: false, error: "Select or enter a person" }
    }
    const existing = await deps.personsRepo.findByNormalizedName(name)
    if (existing) {
      personId = existing.id
    } else {
      const created = await deps.personsRepo.create({ name })
      if (!created) {
        return { success: false, error: "Failed to create person" }
      }
      personId = created.id
      personWasCreated = true
    }
  }

  const existingCredits = await deps.personsRepo.getByFictionId(input.fictionId)
  const alreadyLinked = existingCredits.some(
    (c) => c.person_id === personId && c.role === input.role,
  )
  if (alreadyLinked) {
    return { success: false, error: "This person already has that role on this fiction" }
  }

  const pendingCount = await deps.contributionsRepo.countPendingAddCredits(
    input.fictionId,
    personId,
    input.role,
  )
  if (pendingCount > 0) {
    return {
      success: false,
      error: "This fiction already has a pending credit contribution for that person and role",
    }
  }

  const maxSort = existingCredits.reduce((max, c) => Math.max(max, c.sort_order), -1)

  const created = await deps.contributionsRepo.create({
    userId: input.userId,
    type: "add_credits",
    entityType: "fiction",
    entityId: input.fictionId,
  })
  if (!created) return { success: false, error: "Failed to create contribution" }

  const staged = await deps.contributionsRepo.insertPendingFictionPerson({
    contributionId: created.contributionId,
    personId,
    role: input.role,
    sortOrder: maxSort + 1,
  })
  if (!staged) {
    return { success: false, error: "Failed to save proposed credit" }
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
      personId,
      personWasCreated,
    }
  }

  return {
    success: true,
    contributionId: created.contributionId,
    autoApproved: false,
    personId,
    personWasCreated,
  }
}
