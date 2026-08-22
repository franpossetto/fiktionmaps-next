"use server"

import { listRecentEmailSendsUseCase } from "@/src/emails/application/list-recent-email-sends.usecase"
import { isUserAdminUseCase } from "@/src/users/application/is-user-admin.usecase"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { createClient } from "@/lib/supabase/server"
import { emailsSupabaseAdapter } from "@/src/emails/infrastructure/supabase/email.repository.impl"
import type { ListRecentEmailSendsResult } from "./email.actions.types"

const usersRepo = createUsersSupabaseAdapter(createClient)

/**
 * Recent sends for the admin panel.
 * Do not wrap in unstable_cache — rows contain recipient PII.
 */
export async function listRecentEmailSendsQuery(
  limit = 20,
): Promise<ListRecentEmailSendsResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized" }
  }

  const isAdmin = await isUserAdminUseCase(user.id, usersRepo)
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const sends = await listRecentEmailSendsUseCase(limit, emailsSupabaseAdapter)
    return { success: true, sends }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to list email sends",
    }
  }
}
