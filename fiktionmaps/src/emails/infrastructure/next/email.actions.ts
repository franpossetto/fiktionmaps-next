"use server"

import { createClient } from "@/lib/supabase/server"
import { zodErrorMessage } from "@/lib/validation/http"
import { deleteEmailSendUseCase } from "@/src/emails/application/delete-email-send.usecase"
import { dispatchEmailBatchUseCase } from "@/src/emails/application/dispatch-email-batch.usecase"
import { previewWelcomeEmailUseCase } from "@/src/emails/application/preview-welcome-email.usecase"
import { queueManualEmailUseCase } from "@/src/emails/application/queue-manual-email.usecase"
import { retryEmailSendUseCase } from "@/src/emails/application/retry-email-send.usecase"
import { searchEmailRecipientsUseCase } from "@/src/emails/application/search-email-recipients.usecase"
import {
  emailSendIdSchema,
  previewWelcomeEmailSchema,
  searchEmailRecipientsSchema,
  sendWelcomeEmailSchema,
} from "@/src/emails/domain/email.schemas"
import { emailRendererAdapter } from "@/src/emails/infrastructure/render/email-renderer.adapter"
import { resendEmailTransport } from "@/src/emails/infrastructure/resend/email-transport.adapter"
import { emailDirectoryAdapter } from "@/src/emails/infrastructure/supabase/email-directory.impl"
import { emailsSupabaseAdapter } from "@/src/emails/infrastructure/supabase/email.repository.impl"
import { isUserAdminUseCase } from "@/src/users/application/is-user-admin.usecase"
import { createUsersSupabaseAdapter } from "@/src/users/infrastructure/supabase/user.repository.impl"
import type {
  DeleteEmailSendResult,
  PreviewEmailResult,
  RetryEmailSendResult,
  SearchEmailRecipientsResult,
  SendWelcomeEmailResult,
} from "./email.actions.types"

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

export async function searchEmailRecipientsAction(
  input: unknown,
): Promise<SearchEmailRecipientsResult> {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = searchEmailRecipientsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    const recipients = await searchEmailRecipientsUseCase(
      parsed.data.query,
      parsed.data.filter,
      emailDirectoryAdapter,
    )
    return { success: true, recipients }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to search recipients",
    }
  }
}

export async function previewEmailAction(input: unknown): Promise<PreviewEmailResult> {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = previewWelcomeEmailSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    const rendered = await previewWelcomeEmailUseCase(
      {
        userId: parsed.data.userId,
        customMessage: parsed.data.customMessage,
        subject: parsed.data.subject,
      },
      {
        directory: emailDirectoryAdapter,
        renderer: emailRendererAdapter,
      },
    )
    return { success: true, subject: rendered.subject, html: rendered.html }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to preview email",
    }
  }
}

export async function sendWelcomeEmailAction(input: unknown): Promise<SendWelcomeEmailResult> {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = sendWelcomeEmailSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    const { batchId } = await queueManualEmailUseCase(
      {
        userId: parsed.data.userId,
        customMessage: parsed.data.customMessage,
        subject: parsed.data.subject,
        dryRun: parsed.data.dryRun,
        ignoreAlreadySent: parsed.data.ignoreAlreadySent,
        adminId: auth.userId,
      },
      {
        directory: emailDirectoryAdapter,
        emailsRepo: emailsSupabaseAdapter,
      },
    )

    // Session client + admin RLS is enough for manual sends.
    // Service-role dispatch persist is deferred (see email-pending plan).
    const result = await dispatchEmailBatchUseCase(batchId, {
      emailsRepo: emailsSupabaseAdapter,
      renderer: emailRendererAdapter,
      transport: resendEmailTransport,
    })

    return {
      success: true,
      batchId: result.batchId,
      sendId: result.sendId,
      status: result.status,
      error: result.error,
      resendMessageId: result.resendMessageId,
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to send welcome email",
    }
  }
}

export async function deleteEmailSendAction(input: unknown): Promise<DeleteEmailSendResult> {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = emailSendIdSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    await deleteEmailSendUseCase(parsed.data.sendId, emailsSupabaseAdapter)
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete email send",
    }
  }
}

export async function retryEmailSendAction(input: unknown): Promise<RetryEmailSendResult> {
  const auth = await requireAdmin()
  if ("error" in auth) return { success: false, error: auth.error }

  const parsed = emailSendIdSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: zodErrorMessage(parsed.error) }
  }

  try {
    const result = await retryEmailSendUseCase(parsed.data.sendId, {
      emailsRepo: emailsSupabaseAdapter,
      renderer: emailRendererAdapter,
      transport: resendEmailTransport,
    })
    return {
      success: true,
      batchId: result.batchId,
      sendId: result.sendId,
      status: result.status,
      error: result.error,
      resendMessageId: result.resendMessageId,
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to resend email",
    }
  }
}
