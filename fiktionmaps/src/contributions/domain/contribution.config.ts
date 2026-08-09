import type { ContributionType } from "./contribution.entity"
import { STAFF_ROLES } from "@/src/users/domain/user.roles"

/** Staff `/contributions` fiction create feed: items per page (Supabase `.range`). */
export const STAFF_FICTION_CONTRIBUTIONS_FEED_PAGE_SIZE = 10

/** Places store a single image in `asset_images` with role `avatar` (map + detail). */
export const PLACE_PHOTO_ASSET_ROLE = "avatar" as const

/** Fictions store cover art in `asset_images` with role `cover` (cards + detail). */
export const FICTION_COVER_ASSET_ROLE = "cover" as const

/** Wide header image on fiction detail (`asset_images` role `banner`). */
export const FICTION_BANNER_ASSET_ROLE = "banner" as const

export const CONTRIBUTION_FPP: Record<ContributionType, number> = {
  create_fiction: 5,
  create_place: 13,
  add_scene: 8,
  add_photo: 3,
  add_place_to_scene: 1,
  add_credits: 1,
  enrich_entity: 3,
  correct_data: 3,
  mark_inaccessible: 3,
  add_tip: 5,
  checkin: 8,
}

/** Same default as contribution approval when `fpp_awarded` was never persisted. */
export function resolveContributionFpp(
  type: ContributionType,
  fppAwarded: number | null | undefined,
): number {
  if (fppAwarded != null) return fppAwarded
  return CONTRIBUTION_FPP[type] ?? 0
}

/** Same canonical set as `STAFF_ROLES` (`@/src/users/domain/user.roles`). */
export const MODERATOR_ROLES = STAFF_ROLES

/** Applied to fiction / place / scene when a contribution is approved. */
export const ENTITY_PATCH_ON_CONTRIBUTION_APPROVE = {
  status: "approved" as const,
  active: true,
}
