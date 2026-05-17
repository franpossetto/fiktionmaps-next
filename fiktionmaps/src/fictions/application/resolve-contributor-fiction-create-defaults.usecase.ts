import { resolveEntityContributionInsertDefaults } from "@/src/contributions/application/resolve-entity-contribution-insert-defaults.usecase"
import type { z } from "zod"
import type { fictionRowStatusSchema } from "@/src/fictions/domain/fiction.schemas"

type FictionRowStatus = z.infer<typeof fictionRowStatusSchema>

export type ContributorFictionCreateDefaults = {
  active: boolean
  status: FictionRowStatus
  created_by: string
}

export function resolveContributorFictionCreateDefaults(
  isStaffModerator: boolean,
  userId: string,
): ContributorFictionCreateDefaults {
  const { status, created_by } = resolveEntityContributionInsertDefaults(isStaffModerator, userId)
  return {
    active: isStaffModerator,
    status,
    created_by,
  }
}
