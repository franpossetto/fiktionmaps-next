import type { Fiction } from "@/src/fictions/domain/fiction.entity"

export type FictionDuplicateSummaryForContribute = {
  id: string
  slug: string | null
  title: string
  year: number | null
  type: Fiction["type"]
}

export type CheckFictionDuplicateForContributeResult =
  | { success: true; duplicate: FictionDuplicateSummaryForContribute | null }
  | { success: false; error: string }

export type CreateFictionResult =
  | { success: true; fiction: Fiction; contributionAutoApproved?: boolean }
  | { success: false; error: string }

export type CreateFictionWithImagesResult =
  | { success: true; fiction: Fiction }
  | { success: false; error: string }

export type UpdateFictionResult =
  | { success: true; fiction: Fiction }
  | { success: false; error: string }

export type DeleteFictionResult =
  | { success: true }
  | { success: false; error: string }

export type SetFictionActiveResult =
  | { success: true; fiction: Fiction }
  | { success: false; error: string }

export type UploadFictionImageResult =
  | { success: true; coverImage?: string; coverImageLarge?: string; bannerImage?: string }
  | { success: false; error: string }

export type GetFictionInterestsResult =
  | { success: true; interestIds: string[] }
  | { success: false; error: string }

export type SetFictionInterestsResult =
  | { success: true }
  | { success: false; error: string }

export type LinkFictionPrimaryCreditResult =
  | { success: true }
  | { success: false; error: string }
