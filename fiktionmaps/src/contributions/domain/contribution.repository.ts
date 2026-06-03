import type {
  Contribution,
  ContributionEntityType,
  ContributionPendingImage,
  ContributorProfileWithDate,
  FictionContributionFeedItem,
  FictionContributorProfile,
  PlaceContributionFeedItem,
  StaffCreateContributionsFeedPageInput,
  StaffCreateContributionsFeedPageResult,
  StaffFictionContributionsFeedPageInput,
  StaffFictionContributionsFeedPageResult,
  TopContributorProfile,
  StaffCreateContributionFeedItem,
} from "./contribution.entity"
import type { PlaceContributionPendingImageRole } from "./contribution.entity"
import type {
  ApproveContributionInput,
  CreateContributionInput,
  RejectContributionInput,
} from "./contribution.schemas"

export type InsertContributionPendingPlaceImagesInput = {
  contributionId: string
  role: PlaceContributionPendingImageRole
  paths: { sm: string; lg: string }
}

export interface ContributionsRepositoryPort {
  create(input: CreateContributionInput): Promise<{ contributionId: string } | null>
  insertPendingPlaceImages(input: InsertContributionPendingPlaceImagesInput): Promise<boolean>
  listPendingImagesByContributionId(contributionId: string): Promise<ContributionPendingImage[]>
  deletePendingImagesByContributionId(contributionId: string): Promise<string[]>
  countPendingAddPhotoByPlace(placeId: string): Promise<number>
  getById(id: string): Promise<Contribution | null>
  getByUser(userId: string): Promise<Contribution[]>
  countByUser(userId: string): Promise<number>
  /** Sum of `fpp_awarded` for approved contributions (legacy; prefer profiles.fpp_total). */
  sumApprovedFppAwardedByUser(userId: string): Promise<number>
  getApprovedByEntity(entityType: ContributionEntityType, entityId: string): Promise<Contribution[]>
  /** One row per approved contribution; callers dedupe by profile id. */
  listApprovedProfilesForEntity(
    entityType: ContributionEntityType,
    entityId: string,
  ): Promise<FictionContributorProfile[]>
  /** One row per user; contributedAt = earliest approved contribution for this entity. */
  listApprovedContributorProfilesFirstContributionAt(
    entityType: ContributionEntityType,
    entityId: string,
  ): Promise<ContributorProfileWithDate[]>
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
