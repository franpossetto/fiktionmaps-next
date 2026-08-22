import type {
  EmailBatch,
  EmailRecipient,
  EmailRecipientFilter,
  EmailSend,
  EmailSendWithBatch,
  EmailSource,
  EmailType,
  QueuedEmailRecipient,
  WelcomeTemplateProps,
} from "./email.entity"

export type QueueEmailBatchInput = {
  emailType: EmailType
  subject: string
  customMessage: string
  templateProps: WelcomeTemplateProps
  createdBy: string
  source: EmailSource
  dryRun: boolean
  allowDuplicate: boolean
  recipients: QueuedEmailRecipient[]
}

export type MarkSendSentInput = {
  sendId: string
  resendMessageId: string
  sentAt: string
}

export type MarkSendFailedInput = {
  sendId: string
  error: string
}

export type MarkSendSkippedInput = {
  sendId: string
  error: string
}

export interface EmailsRepositoryPort {
  queueBatch(input: QueueEmailBatchInput): Promise<string>
  getBatch(batchId: string): Promise<EmailBatch | null>
  getSendById(sendId: string): Promise<EmailSend | null>
  listSendsForBatch(batchId: string): Promise<EmailSend[]>
  markBatchDispatching(batchId: string): Promise<void>
  markBatchDone(batchId: string): Promise<void>
  markBatchFailed(batchId: string): Promise<void>
  markBatchQueued(batchId: string): Promise<void>
  markSendQueued(sendId: string): Promise<void>
  markSendSent(input: MarkSendSentInput): Promise<void>
  markSendFailed(input: MarkSendFailedInput): Promise<void>
  markSendSkipped(input: MarkSendSkippedInput): Promise<void>
  deleteBatch(batchId: string): Promise<void>
  listRecentSends(limit: number): Promise<EmailSendWithBatch[]>
}

export interface EmailUserDirectoryPort {
  search(query: string, filter: EmailRecipientFilter): Promise<EmailRecipient[]>
  resolve(ids: string[]): Promise<EmailRecipient[]>
}

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
  from: string
  idempotencyKey: string
}

export type SendEmailResult = {
  messageId: string
}

export interface EmailTransportPort {
  send(input: SendEmailInput): Promise<SendEmailResult>
}

export type RenderEmailInput = {
  emailType: EmailType
  props: WelcomeTemplateProps
  subject: string
}

export interface EmailRendererPort {
  render(input: RenderEmailInput): Promise<{ html: string; text: string }>
}
