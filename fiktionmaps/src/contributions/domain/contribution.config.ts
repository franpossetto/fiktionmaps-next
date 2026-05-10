import type { ContributionType } from "./contribution.entity"

export const CONTRIBUTION_FPP: Record<ContributionType, number> = {
  create_fiction: 5,
  create_place: 13,
  add_scene: 8,
  add_photo: 3,
  enrich_entity: 3,
  correct_data: 3,
  mark_inaccessible: 3,
  add_tip: 5,
  checkin: 8,
}

export const MODERATOR_ROLES = ["moderator", "admin"] as const
