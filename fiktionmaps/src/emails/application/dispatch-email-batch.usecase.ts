import type {
  EmailSend,
  EmailSendStatus,
  WelcomeTemplateProps,
} from "@/src/emails/domain/email.entity"
import type {
  EmailRendererPort,
  EmailsRepositoryPort,
  EmailTransportPort,
} from "@/src/emails/domain/email.repository"

function resolveFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim()
  if (from) return from
  if (process.env.NODE_ENV === "development") {
    return "onboarding@resend.dev"
  }
  throw new Error("EMAIL_FROM is required")
}

function parseAllowlist(): Set<string> | null {
  const raw = process.env.EMAIL_ALLOWED_RECIPIENTS?.trim()
  if (!raw) return null
  const emails = raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  return emails.length > 0 ? new Set(emails) : null
}

export type DispatchEmailBatchResult = {
  batchId: string
  sendId: string
  status: EmailSendStatus
  error: string | null
  resendMessageId: string | null
}

export async function dispatchEmailBatchUseCase(
  batchId: string,
  deps: {
    emailsRepo: EmailsRepositoryPort
    renderer: EmailRendererPort
    transport: EmailTransportPort
  },
): Promise<DispatchEmailBatchResult> {
  const batch = await deps.emailsRepo.getBatch(batchId)
  if (!batch) {
    throw new Error("Email batch not found")
  }

  await deps.emailsRepo.markBatchDispatching(batchId)

  const sends = await deps.emailsRepo.listSendsForBatch(batchId)
  const send = sends[0]
  if (!send) {
    await deps.emailsRepo.markBatchFailed(batchId)
    throw new Error("Email send not found for batch")
  }

  if (batch.dryRun || send.status === "skipped") {
    await deps.emailsRepo.markBatchDone(batchId)
    return {
      batchId,
      sendId: send.id,
      status: "skipped",
      error: send.error ?? "dry_run",
      resendMessageId: null,
    }
  }

  try {
    const result = await dispatchOneSend(send, batch.subject, batch.templateProps, deps)
    await deps.emailsRepo.markBatchDone(batchId)
    return {
      batchId,
      sendId: send.id,
      status: result.status,
      error: result.error,
      resendMessageId: result.resendMessageId,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dispatch failed"
    await deps.emailsRepo.markSendFailed({ sendId: send.id, error: message })
    await deps.emailsRepo.markBatchFailed(batchId)
    return {
      batchId,
      sendId: send.id,
      status: "failed",
      error: message,
      resendMessageId: null,
    }
  }
}

async function dispatchOneSend(
  send: EmailSend,
  subject: string,
  templateProps: WelcomeTemplateProps,
  deps: {
    emailsRepo: EmailsRepositoryPort
    renderer: EmailRendererPort
    transport: EmailTransportPort
  },
): Promise<{ status: EmailSendStatus; error: string | null; resendMessageId: string | null }> {
  const allowlist = parseAllowlist()
  if (allowlist && !allowlist.has(send.emailTo.toLowerCase())) {
    await deps.emailsRepo.markSendSkipped({ sendId: send.id, error: "not_allowlisted" })
    return { status: "skipped", error: "not_allowlisted", resendMessageId: null }
  }

  const { html, text } = await deps.renderer.render({
    emailType: send.emailType,
    props: templateProps,
    subject,
  })

  const from = resolveFromAddress()
  const { messageId } = await deps.transport.send({
    to: send.emailTo,
    subject,
    html,
    text,
    from,
    idempotencyKey: `email_send:${send.id}`,
  })

  const sentAt = new Date().toISOString()
  await deps.emailsRepo.markSendSent({
    sendId: send.id,
    resendMessageId: messageId,
    sentAt,
  })

  return { status: "sent", error: null, resendMessageId: messageId }
}
