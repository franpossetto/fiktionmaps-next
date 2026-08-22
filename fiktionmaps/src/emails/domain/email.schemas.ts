import { z } from "zod"
import { CUSTOM_MESSAGE_MAX } from "./email.entity"

export const emailRecipientFilterSchema = z.enum(["all", "new_7d", "no_welcome_sent"])

export const searchEmailRecipientsSchema = z.object({
  query: z.string().trim().max(200).default(""),
  filter: emailRecipientFilterSchema.default("all"),
})

const emailSubjectSchema = z.string().trim().max(200)

export const previewWelcomeEmailSchema = z.object({
  userId: z.string().uuid(),
  customMessage: z.string().trim().max(CUSTOM_MESSAGE_MAX).default(""),
  subject: emailSubjectSchema.optional(),
})

export const previewNewContentEmailSchema = z.object({
  cityId: z.string().uuid(),
  placeIds: z.array(z.string().uuid()).min(1).max(20),
  recipientName: z.string().trim().max(80).optional(),
  subject: emailSubjectSchema.optional(),
})

export const sendWelcomeEmailSchema = z.object({
  userId: z.string().uuid(),
  customMessage: z.string().trim().max(CUSTOM_MESSAGE_MAX).default(""),
  subject: emailSubjectSchema.optional(),
  dryRun: z.boolean().optional().default(false),
  ignoreAlreadySent: z.boolean().optional().default(false),
})

export const emailSendIdSchema = z.object({
  sendId: z.string().uuid(),
})

export type SearchEmailRecipientsInput = z.infer<typeof searchEmailRecipientsSchema>
export type PreviewWelcomeEmailInput = z.infer<typeof previewWelcomeEmailSchema>
export type PreviewNewContentEmailInput = z.infer<typeof previewNewContentEmailSchema>
export type SendWelcomeEmailInput = z.infer<typeof sendWelcomeEmailSchema>
export type EmailSendIdInput = z.infer<typeof emailSendIdSchema>
