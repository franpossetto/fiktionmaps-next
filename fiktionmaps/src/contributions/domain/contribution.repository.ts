import type {
  Contribution,
  ContributionEntityType,
  ContributionPendingImage,
  ContributionType,
  ContributorEntityScopeCounts,
  ContributorProfileWithDate,
  FictionContributionFeedItem,
  FictionContributorProfile,
  FictionContributorScopeEntry,
  FictionScopeContributorContributionItem,
  PlaceContributionFeedItem,
  StaffCreateContributionsFeedPageInput,
  StaffCreateContributionsFeedPageResult,
  StaffFictionContributionsFeedPageInput,
  StaffFictionContributionsFeedPageResult,
  TopContributorProfile,
  StaffCreateContributionFeedItem,
} from "./contribution.entity"
import type { ContributionPendingImageRole } from "./contribution.entity"
import type {
  ApproveContributionInput,
  CreateContributionInput,
  RejectContributionInput,
} from "./contribution.schemas"

export type InsertContributionPendingImagesInput = {
  contributionId: string
  role: ContributionPendingImageRole
  paths: { sm?: string; lg: string }
}

/** @deprecated Use InsertContributionPendingImagesInput */
export type InsertContributionPendingPlaceImagesInput = InsertContributionPendingImagesInput

export interface ContributionsRepositoryPort {
  create(input: CreateContributionInput): Promise<{ contributionId: string } | null>
  insertPendingContributionImages(input: InsertContributionPendingImagesInput): Promise<boolean>
  countPendingAddPhotoByFiction(fictionId: string): Promise<number>
  countPendingAddPhotoByFictionAndRole(
    fictionId: string,
    role: Extract<ContributionPendingImageRole, "cover" | "banner">,
  ): Promise<number>
  listPendingImagesByContributionId(contributionId: string): Promise<ContributionPendingImage[]>
  deletePendingImagesByContributionId(contributionId: string): Promise<string[]>
  countPendingAddPhotoByPlace(placeId: string): Promise<number>
  getById(id: string): Promise<Contribution | null>
  getByUser(userId: string): Promise<Contribution[]>
  countByUser(userId: string): Promise<number>
  /** Distinct fictions (direct + via places) and places with approved contributions. */
  countApprovedFictionAndPlaceScopesByUser(userId: string): Promise<ContributorEntityScopeCounts>
  /** Sum of `fpp_awarded` for approved contributions (legacy; prefer profiles.fpp_total). */
  sumApprovedFppAwardedByUser(userId: string): Promise<number>
  getApprovedByEntity(entityType: ContributionEntityType, entityId: string): Promise<Contribution[]>
  /** One row per approved contribution; callers dedupe by profile id. */
  listApprovedProfilesForEntity(
    entityType: ContributionEntityType,
    entityId: string,
  ): Promise<FictionContributorProfile[]>
  /** One row per approved contribution on the fiction and its places; callers aggregate FPP by profile id. */
  listApprovedContributorProfilesForFictionScope(fictionId: string): Promise<FictionContributorScopeEntry[]>
  /** One row per user; contributedAt = earliest approved contribution for this entity. */
  listApprovedContributorProfilesFirstContributionAt(
    entityType: ContributionEntityType,
    entityId: string,
  ): Promise<ContributorProfileWithDate[]>
  /** Approved contribution detail rows for one user in a fiction scope (fiction + its places). */
  listApprovedContributionsForUserInFictionScope(
    fictionId: string,
    userId: string,
  ): Promise<FictionScopeContributorContributionItem[]>
  getPending(): Promise<Contribution[]>
  /**
   * Staff feed: tab "all" = pending + approved; tab "rejected" = solo rejected.
   * Paginación server-side; orden en "all": pendientes primero, luego aprobados
   * (`ORDER BY status DESC, created_at DESC`); un solo status solo por `created_at` DESC.
   */
  listFictionCreateContributionsStaffReviewFeedPage(
    input: StaffFictionContributionsFeedPageInput,
  ): Promise<StaffFictionContributionsFeedPageResult>
  listCreateContributionsStaffReviewFeedPage(
    input: StaffCreateContributionsFeedPageInput,
  ): Promise<StaffCreateContributionsFeedPageResult>
  getFictionCreateContributionWithContributorById(id: string): Promise<FictionContributionFeedItem | null>
  getPlaceCreateContributionWithContributorById(id: string): Promise<PlaceContributionFeedItem | null>
  /** Single lookup for staff detail (create_fiction | create_place | add_photo). */
  getCreateContributionFeedItemById(id: string): Promise<StaffCreateContributionFeedItem | null>
  approve(input: ApproveContributionInput): Promise<boolean>
  reject(input: RejectContributionInput): Promise<boolean>
  listTopContributors(limit: number): Promise<TopContributorProfile[]>
}
