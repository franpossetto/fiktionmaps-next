import type { FictionScopeContributorContributionItem, ContributorEntityScopeCounts } from "@/src/contributions/domain/contribution.entity"
import type { AdminContributionsListPageResult } from "@/src/contributions/domain/contribution.repository"

export type CreateContributionResult =
  | { success: true; contributionId: string; autoApproved: boolean }
  | { success: false; error: string }

export type ApproveContributionResult =
  | { success: true }
  | { success: false; error: string }

export type RejectContributionResult =
  | { success: true }
  | { success: false; error: string }

export type DeleteContributionResult =
  | { success: true }
  | { success: false; error: string }

export type ListAdminContributionsResult =
  | { success: true; page: AdminContributionsListPageResult }
  | { success: false; error: string }

export type GetFictionScopeContributorContributionsResult =
  | { success: true; items: FictionScopeContributorContributionItem[]; scopeCounts: ContributorEntityScopeCounts }
  | { success: false; error: string }
