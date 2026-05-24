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

/** Staff feed row: a create_fiction contribution on a fiction entity plus submitter profile. */
export interface FictionContributionFeedItem extends Contribution {
  contributor: FictionContributorProfile
  /** Draft fiction title when the row is readable under RLS (staff). */
  fictionTitle: string | null
  /** Cover thumbnail URL (`asset_images` cover sm) when present. */
  fictionCoverUrl: string | null
}

/** Same as FictionContributorProfile plus first approved contribution timestamp for this entity (deduped per user). */
export interface ContributorProfileWithDate extends FictionContributorProfile {
  contributedAt: string
}

/** Profile with accumulated FPP total for global top-contributors ranking. */
export interface TopContributorProfile extends FictionContributorProfile {
  fppTotal: number
}

/** Staff: submitter activity + lifetime FPP on profile (contributions detail). */
export interface ContributorModerationContext {
  totalContributions: number
  otherContributionsCount: number
  fppTotal: number
}

/** Staff fiction create feed tab — matches UI `ContributionsFeedTab`. */
export type StaffFictionContributionsFeedStatusTab = "all" | "pending" | "approved"

/** Staff `/contributions` feed filter for create_fiction vs create_place. */
export type StaffContributionsFeedKind = "fiction" | "place" | "all"

export type StaffFictionContributionsFeedPageInput = {
  userIdFilter?: string
  statusTab: StaffFictionContributionsFeedStatusTab
  limit: number
  offset: number
}

export type StaffFictionContributionsFeedPageResult = {
  items: FictionContributionFeedItem[]
  totalCount: number
}

/** Staff feed row: a create_place contribution plus submitter and place/fiction snapshots. */
export interface PlaceContributionFeedItem extends Contribution {
  contributor: FictionContributorProfile
  placeName: string | null
  placeAvatarUrl: string | null
  fictionTitle: string | null
  fictionId: string | null
}

export type StaffCreateContributionsFeedPageInput = {
  kind: StaffContributionsFeedKind
  userIdFilter?: string
  statusTab: StaffFictionContributionsFeedStatusTab
  limit: number
  offset: number
}

export type StaffCreateContributionFeedItem = FictionContributionFeedItem | PlaceContributionFeedItem

export type StaffCreateContributionsFeedPageResult = {
  items: StaffCreateContributionFeedItem[]
  totalCount: number
}

export function isPlaceContributionFeedItem(
  item: StaffCreateContributionFeedItem,
): item is PlaceContributionFeedItem {
  return item.entityType === "place" && item.type === "create_place"
}
