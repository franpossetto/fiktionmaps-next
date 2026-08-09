import type { ContributionRow } from "@/supabase/database.types"

export type ContributionStatus = ContributionRow["status"]

export type ContributionType = ContributionRow["type"]

export type ContributionEntityType = ContributionRow["entity_type"]

export type ContributionPendingImageRole = "avatar" | "hero" | "cover" | "banner"

/** @deprecated Use ContributionPendingImageRole */
export type PlaceContributionPendingImageRole = Extract<ContributionPendingImageRole, "avatar" | "hero">

export type ContributionPendingImageVariant = "xs" | "sm" | "lg" | "xl"

export interface ContributionPendingImage {
  id: string
  contributionId: string
  role: ContributionPendingImageRole
  variant: ContributionPendingImageVariant
  storagePath: string
  focusX: number
  focusY: number
  createdAt: string
}

/** Pending storage paths grouped by asset role (sm/lg are variants of the same upload per role). */
export type ContributionPendingImagesByRole = Partial<
  Record<ContributionPendingImageRole, Partial<Record<ContributionPendingImageVariant, string>>>
>

/** @deprecated Single-role snapshot; use ContributionPendingImagesByRole. */
export type ContributionPendingImagesSnapshot = {
  role: ContributionPendingImageRole
  paths: Partial<Record<ContributionPendingImageVariant, string>>
}

export function pendingImagesRowsToByRole(rows: ContributionPendingImage[]): ContributionPendingImagesByRole | null {
  if (rows.length === 0) return null
  const byRole: ContributionPendingImagesByRole = {}
  for (const row of rows) {
    const rolePaths = byRole[row.role] ?? {}
    rolePaths[row.variant] = row.storagePath
    byRole[row.role] = rolePaths
  }
  return Object.keys(byRole).length > 0 ? byRole : null
}

export function getPendingPathsForRole(
  byRole: ContributionPendingImagesByRole | null | undefined,
  role: ContributionPendingImageRole,
): Partial<Record<ContributionPendingImageVariant, string>> | null {
  const paths = byRole?.[role]
  return paths && Object.keys(paths).length > 0 ? paths : null
}

/** @deprecated Use pendingImagesRowsToByRole */
export function pendingImagesToSnapshot(rows: ContributionPendingImage[]): ContributionPendingImagesSnapshot | null {
  const byRole = pendingImagesRowsToByRole(rows)
  if (!byRole) return null
  const role = (Object.keys(byRole)[0] ?? null) as ContributionPendingImageRole | null
  if (!role) return null
  const paths = byRole[role]
  return paths ? { role, paths } : null
}

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

/** Profile contributions list row: contribution + resolved entity name. */
export interface ProfileContributionItem extends Contribution {
  /** Fiction title / place name / scene title for `entityId`. */
  entityLabel: string | null
  /** Parent fiction title when the entity is a place or scene. */
  parentLabel: string | null
}

/** Profile snapshot for listing fiction collaborators (approved contributions on the fiction entity). */
export interface FictionContributorProfile {
  id: string
  username: string | null
  fullName: string | null
  avatarUrl: string | null
}

/** Fiction contributor with FPP earned in this fiction scope (fiction + its places). */
export interface FictionContributorRankedProfile extends FictionContributorProfile {
  fppTotal: number
}

/** One approved contribution row in a fiction scope (for FPP aggregation). */
export interface FictionContributorScopeEntry extends FictionContributorProfile {
  fppAwarded: number
}

/** Staff feed row: a create_fiction / add_photo / add_credits contribution on a fiction entity plus submitter profile. */
export interface FictionContributionFeedItem extends Contribution {
  contributor: FictionContributorProfile
  /** Draft fiction title when the row is readable under RLS (staff). */
  fictionTitle: string | null
  /** Cover thumbnail URL (`asset_images` cover sm) when present. */
  fictionCoverUrl: string | null
  pendingImagesByRole: ContributionPendingImagesByRole | null
  /** Proposed credit for `add_credits` (staging; one contribution = one person+role). */
  proposedCredit: {
    personId: string
    personName: string | null
    role: string
  } | null
}

/** Same as FictionContributorProfile plus first approved contribution timestamp for this entity (deduped per user). */
export interface ContributorProfileWithDate extends FictionContributorProfile {
  contributedAt: string
}

/** Profile with accumulated FPP total for global top-contributors ranking. */
export interface TopContributorProfile extends FictionContributorProfile {
  fppTotal: number
}

/** Distinct fiction and place scopes with approved contributions (global user footprint). */
export interface ContributorEntityScopeCounts {
  fictionCount: number
  placeCount: number
}

/** One approved contribution row for the fiction-scope contributor modal. */
export interface FictionScopeContributorContributionItem {
  id: string
  type: ContributionType
  entityType: ContributionEntityType
  entityId: string
  entityLabel: string | null
  fppAwarded: number
  createdAt: string
}

/** Which contributor modal to open from TopContributorsList (one variant per page context). */
export type TopContributorsModalContext = { type: "fiction"; fictionId: string; fictionTitle: string }

/** Staff: submitter activity + lifetime FPP on profile (contributions detail). */
export interface ContributorModerationContext {
  totalContributions: number
  otherContributionsCount: number
  fppTotal: number
}

/** Staff fiction create feed tab — matches UI `ContributionsFeedTab`. */
export type StaffFictionContributionsFeedStatusTab = "all" | "pending" | "approved" | "rejected"

/** Staff `/contributions` feed filter for create_fiction vs create_place vs add_scene. */
export type StaffContributionsFeedKind = "fiction" | "place" | "scene" | "all"

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
  pendingImagesByRole: ContributionPendingImagesByRole | null
}

/** Staff feed row: an add_scene / add_place_to_scene contribution plus scene snapshots. */
export interface SceneContributionFeedItem extends Contribution {
  contributor: FictionContributorProfile
  sceneTitle: string | null
  sceneVideoUrl: string | null
  /** Low-res preview MP4 when available; feed thumbs should prefer this over `sceneVideoUrl`. */
  scenePreviewUrl: string | null
  fictionId: string | null
  fictionTitle: string | null
  placeNames: string[]
  /** Proposed place(s) for `add_place_to_scene` (staging; one contribution = one place). */
  proposedPlaces: Array<{
    placeId: string
    name: string | null
    avatarUrl: string | null
  }>
}

export type StaffCreateContributionsFeedPageInput = {
  kind: StaffContributionsFeedKind
  userIdFilter?: string
  statusTab: StaffFictionContributionsFeedStatusTab
  limit: number
  offset: number
}

export type StaffCreateContributionFeedItem =
  | FictionContributionFeedItem
  | PlaceContributionFeedItem
  | SceneContributionFeedItem

export type StaffCreateContributionsFeedPageResult = {
  items: StaffCreateContributionFeedItem[]
  totalCount: number
}

export function isPlaceContributionFeedItem(
  item: StaffCreateContributionFeedItem,
): item is PlaceContributionFeedItem {
  return item.entityType === "place" && (item.type === "create_place" || item.type === "add_photo")
}

export function isPlaceAddPhotoContribution(item: Contribution): boolean {
  return item.entityType === "place" && item.type === "add_photo"
}

export function isFictionAddPhotoContribution(item: Contribution): boolean {
  return item.entityType === "fiction" && item.type === "add_photo"
}

export function isFictionContributionFeedItem(
  item: StaffCreateContributionFeedItem,
): item is FictionContributionFeedItem {
  return (
    item.entityType === "fiction" &&
    (item.type === "create_fiction" || item.type === "add_photo" || item.type === "add_credits")
  )
}

export function isFictionCreateContributionFeedItem(item: FictionContributionFeedItem): boolean {
  return item.type === "create_fiction"
}

export function isSceneContributionFeedItem(
  item: StaffCreateContributionFeedItem,
): item is SceneContributionFeedItem {
  return (
    item.entityType === "scene" &&
    (item.type === "add_scene" || item.type === "add_place_to_scene")
  )
}

export function isAddPlaceToSceneContribution(item: Contribution): boolean {
  return item.entityType === "scene" && item.type === "add_place_to_scene"
}

export function isAddCreditsContribution(item: Contribution): boolean {
  return item.entityType === "fiction" && item.type === "add_credits"
}
