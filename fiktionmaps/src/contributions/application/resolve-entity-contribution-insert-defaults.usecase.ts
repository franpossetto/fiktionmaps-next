import type { z } from "zod"
import type { fictionRowStatusSchema } from "@/src/fictions/domain/fiction.schemas"

export type EntityContributionRowStatus = z.infer<typeof fictionRowStatusSchema>

export type EntityContributionInsertDefaults = {
  status: EntityContributionRowStatus
  created_by: string
}

/** Server-only: contribution / entity row status and attribution from moderator roles + session user. */
export function resolveEntityContributionInsertDefaults(
  isStaffModerator: boolean,
  userId: string,
): EntityContributionInsertDefaults {
  if (isStaffModerator) {
    return { status: "approved", created_by: userId }
  }
  return { status: "pending", created_by: userId }
}
