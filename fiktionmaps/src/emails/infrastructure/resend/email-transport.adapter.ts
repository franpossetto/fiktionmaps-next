import { Resend } from "resend"
import type { EmailTransportPort, SendEmailInput, SendEmailResult } from "@/src/emails/domain/email.repository"

export function createResendEmailTransport(apiKey = process.env.RESEND_API_KEY): EmailTransportPort {
  return {
    async send(input: SendEmailInput): Promise<SendEmailResult> {
      if (!apiKey?.trim()) {
        throw new Error("RESEND_API_KEY is required")
      }
      const resend = new Resend(apiKey)
      const { data, error } = await resend.emails.send(
        {
          from: input.from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        },
        { idempotencyKey: input.idempotencyKey },
      )

      if (error) {
        throw new Error(error.message)
      }
      if (!data?.id) {
        throw new Error("Resend did not return a message id")
      }
      return { messageId: data.id }
    },
  }
}

export const resendEmailTransport = createResendEmailTransport()
