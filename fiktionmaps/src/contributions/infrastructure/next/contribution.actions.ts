"use server"

import { revalidatePath, updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { zodErrorMessage } from "@/lib/validation/http"
import { approveContributionUseCase } from "@/src/contributions/application/approve-contribution.usecase"
import { createContributionUseCase } from "@/src/contributions/application/create-contribution.usecase"
import { ensureUserIsModeratorUseCase } from "@/src/contributions/application/ensure-user-is-moderator.usecase"
import { rejectContributionUseCase } from "@/src/contributions/application/reject-contribution.usecase"
import { MODERATOR_ROLES } from "@/src/contributions/domain/contribution.config"
import {
  approveContributionSchema,
  createContributionSchema,
  rejectContributionSchema,
} from "@/src/contributions/domain/contribution.schemas"
import { supabaseRepositoryAdapter as contributionsRepo } from "@/src/contributions/infrastructure/supabase/contribution.repository.impl"
import { profilesReaderSupabaseAdapter } from "@/src/contributions/infrastructure/supabase/profiles-reader.supabase"
import type {
  ApproveContributionResult,
  CreateContributionResult,
  RejectContributionResult,
} from "./contribution.actions.types"
import type { ApproveContributionData, CreateContributionData, RejectContributionData } from "@/src/contributions/domain/contribution.schemas"

export type {
  ApproveContributionResult,
  CreateContributionResult,
  RejectContributionResult,
} from "./contribution.actions.types"

export async function createContributionAction(data: CreateContributionData): Promise<CreateContributionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = createContributionSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const role = await profilesReaderSupabaseAdapter.getRole(user.id)
  const autoApprove =
    role != null && MODERATOR_ROLES.includes(role as (typeof MODERATOR_ROLES)[number])

  const result = await createContributionUseCase(
    { ...parsed.data, userId: user.id },
    contributionsRepo,
    autoApprove,
  )
  if (!result) return { success: false, error: "Failed to create contribution" }

  revalidatePath("/admin")
  updateTag("contributions")
  if (result.autoApproved) {
    updateTag("profiles")
  }
  return { success: true, contributionId: result.contributionId }
}

export async function approveContributionAction(data: ApproveContributionData): Promise<ApproveContributionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const moderatorOk = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  if (!moderatorOk) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = approveContributionSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const ok = await approveContributionUseCase({ ...parsed.data, moderatorId: user.id }, contributionsRepo)
  if (!ok) return { success: false, error: "Approve failed or contribution is not pending" }

  revalidatePath("/admin")
  updateTag("contributions")
  updateTag("profiles")
  return { success: true }
}

export async function rejectContributionAction(data: RejectContributionData): Promise<RejectContributionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const moderatorOk = await ensureUserIsModeratorUseCase(
    user.id,
    profilesReaderSupabaseAdapter,
    MODERATOR_ROLES,
  )
  if (!moderatorOk) {
    return { success: false, error: "Unauthorized" }
  }

  const parsed = rejectContributionSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: zodErrorMessage(parsed.error) }

  const ok = await rejectContributionUseCase({ ...parsed.data, moderatorId: user.id }, contributionsRepo)
  if (!ok) return { success: false, error: "Reject failed or contribution is not pending" }

  revalidatePath("/admin")
  updateTag("contributions")
  updateTag("profiles")
  return { success: true }
}
