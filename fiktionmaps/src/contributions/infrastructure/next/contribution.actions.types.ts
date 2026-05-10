export type CreateContributionResult =
  | { success: true; contributionId: string }
  | { success: false; error: string }

export type ApproveContributionResult =
  | { success: true }
  | { success: false; error: string }

export type RejectContributionResult =
  | { success: true }
  | { success: false; error: string }
