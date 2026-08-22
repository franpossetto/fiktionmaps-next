export type EmailType = "welcome"

export type EmailActor =
  | { source: "manual"; adminId: string }
  | { source: "system"; eventId?: string }

export type EmailBatchStatus = "queued" | "dispatching" | "done" | "failed"
export type EmailSendStatus = "queued" | "sent" | "failed" | "skipped"
export type EmailSource = "manual" | "system"

export type EmailRecipientFilter = "all" | "new_7d" | "no_welcome_sent"

export const CUSTOM_MESSAGE_MAX = 1000

export type WelcomeTemplateProps = {
  name: string
  customMessage: string
  profileHref: string
  mapHref: string
  unsubscribeUrl?: string | null
}

export type EmailRecipient = {
  id: string
  email: string
  username: string | null
  fullName: string | null
  createdAt?: string
}

export type QueuedEmailRecipient = {
  userId: string
  emailTo: string
  nameTo: string
}

export type EmailBatch = {
  id: string
  emailType: EmailType
  subject: string
  customMessage: string
  templateProps: WelcomeTemplateProps
  createdBy: string
  source: EmailSource
  status: EmailBatchStatus
  dryRun: boolean
  createdAt: string
  updatedAt: string
}

export type EmailSend = {
  id: string
  batchId: string
  userId: string
  emailType: EmailType
  emailTo: string
  nameTo: string
  status: EmailSendStatus
  error: string | null
  attempts: number
  resendMessageId: string | null
  sentAt: string | null
  createdAt: string
}

export type EmailSendWithBatch = EmailSend & {
  subject: string
  dryRun: boolean
  source: EmailSource
}

export type QueueManualEmailInput = {
  userId: string
  customMessage: string
  /** Optional override; defaults to welcomeSubject(firstName). */
  subject?: string
  dryRun?: boolean
  /** Testing escape hatch: skip welcome already-sent check. */
  ignoreAlreadySent?: boolean
}

export type RenderedEmail = {
  subject: string
  html: string
  text: string
}
