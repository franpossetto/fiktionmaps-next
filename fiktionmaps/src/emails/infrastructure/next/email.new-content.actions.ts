"use server"

import { createClient } from "@/lib/supabase/server"
import { zodErrorMessage } from "@/lib/validation/http"
import { previewNewContentEmailUseCase } from "@/src/emails/application/preview-new-content-email.usecase"
import { previewNewContentEmailSchema } from "@/src/emails/domain/email.schemas"
import { renderNewContentEmail } from "@/src/emails/infrastructure/render/email-renderer.adapter"
import { isUserAdminUseCase } from "@/src/users/application/is-user-admin.usecase"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import { supabaseRepositoryAdapter as citiesRepo } from "@/src/cities/infrastructure/supabase/city.repository.impl"
import { supabaseRepositoryAdapter as fictionsRepo } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { supabaseRepositoryAdapter as placesRepo } from "@/src/places/infrastructure/supabase/place.repository.impl"
import type { PreviewEmailResult } from "./email.actions.types"

const usersRepo = createUsersSupabaseAdapter(createClient)

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Unauthorized" }
  }

  const isAdmin = await isUserAdminUseCase(user.id, usersRepo)
  if (!isAdmin) {
    return { error: "Unauthorized" }
  }

  return { userId: user.id }
}

export async function previewNewContentEmailAction(
  input: unknown,
): Promise<PreviewEmailResult> {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = previewNewContentEmailSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    const rendered = await previewNewContentEmailUseCase(parsed.data, {
      citiesRepo,
      placesRepo,
      fictionsRepo,
      renderer: renderNewContentEmail,
    })
    return { success: true, subject: rendered.subject, html: rendered.html }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to preview new content email",
    }
  }
}
