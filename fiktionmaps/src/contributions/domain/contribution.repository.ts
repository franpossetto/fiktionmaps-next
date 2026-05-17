import type {
  Contribution,
  ContributionEntityType,
  ContributorProfileWithDate,
  FictionContributorProfile,
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
  approve(input: ApproveContributionInput): Promise<boolean>
  reject(input: RejectContributionInput): Promise<boolean>
  listTopContributors(limit: number): Promise<TopContributorProfile[]>
}
