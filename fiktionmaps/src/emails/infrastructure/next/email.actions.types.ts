import type {
  EmailRecipient,
  EmailSendStatus,
  EmailSendWithBatch,
} from "@/src/emails/domain/email.entity"

export type SearchEmailRecipientsResult =
  | { success: true; recipients: EmailRecipient[] }
  | { success: false; error: string }

export type PreviewEmailResult =
  | { success: true; subject: string; html: string }
  | { success: false; error: string }


export type SendWelcomeEmailResult =
  | {
      success: true
      batchId: string
      sendId: string
      status: EmailSendStatus
      error: string | null
      resendMessageId: string | null
    }
  | { success: false; error: string }

export type ListRecentEmailSendsResult =
  | { success: true; sends: EmailSendWithBatch[] }
  | { success: false; error: string }

export type DeleteEmailSendResult =
  | { success: true }
  | { success: false; error: string }

export type RetryEmailSendResult =
  | {
      success: true
      batchId: string
      sendId: string
      status: EmailSendStatus
      error: string | null
      resendMessageId: string | null
    }
  | { success: false; error: string }
