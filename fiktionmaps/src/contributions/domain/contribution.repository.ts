import type {
  Contribution,
  ContributionEntityType,
  ContributorProfileWithDate,
  FictionContributionFeedItem,
  FictionContributorProfile,
  PlaceContributionFeedItem,
  StaffCreateContributionsFeedPageInput,
  StaffCreateContributionsFeedPageResult,
  StaffFictionContributionsFeedPageInput,
  StaffFictionContributionsFeedPageResult,
  TopContributorProfile,
} from "./contribution.entity"
import type {
  ApproveContributionInput,
  CreateContributionInput,
  RejectContributionInput,
} from "./contribution.schemas"

export interface ContributionsRepositoryPort {
  create(input: CreateContributionInput): Promise<{ contributionId: string } | null>
  getById(id: string): Promise<Contribution | null>
  getByUser(userId: string): Promise<Contribution[]>
  countByUser(userId: string): Promise<number>
  /** Sum of `fpp_awarded` for approved contributions (same basis as the top-contributors list). */
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
   * create_fiction en fiction: solo pending y approved (sin rejected).
   * Paginación server-side; orden: pendientes primero, luego aprobados en tab "all"
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
  approve(input: ApproveContributionInput): Promise<boolean>
  reject(input: RejectContributionInput): Promise<boolean>
  listTopContributors(limit: number): Promise<TopContributorProfile[]>
}
