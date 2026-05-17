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
  if (isStaffModerator) {
    return { active: true, status: "approved", created_by: userId }
  }
  return { active: false, status: "pending", created_by: userId }
}
