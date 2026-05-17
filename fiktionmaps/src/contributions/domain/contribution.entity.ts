import type { ContributionRow } from "@/supabase/database.types"

export type ContributionStatus = ContributionRow["status"]

export type ContributionType = ContributionRow["type"]

export type ContributionEntityType = ContributionRow["entity_type"]

export interface Contribution {
  id: string
  userId: string
  type: ContributionType
  entityType: ContributionEntityType
  entityId: string
  status: ContributionStatus
  moderatorId: string | null
  moderatorNote: string | null
  fppAwarded: number | null
  createdAt: string
  updatedAt: string
}

/** Profile snapshot for listing fiction collaborators (approved contributions on the fiction entity). */
export interface FictionContributorProfile {
  id: string
  username: string | null
  fullName: string | null
  avatarUrl: string | null
}

/** Same as FictionContributorProfile plus first approved contribution timestamp for this entity (deduped per user). */
export interface ContributorProfileWithDate extends FictionContributorProfile {
  contributedAt: string
}

/** Profile with accumulated FPP total for global top-contributors ranking. */
export interface TopContributorProfile extends FictionContributorProfile {
  fppTotal: number
}
