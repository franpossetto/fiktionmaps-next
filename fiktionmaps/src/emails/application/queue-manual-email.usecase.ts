import { getSiteUrl } from "@/lib/site"
import type { QueueManualEmailInput } from "@/src/emails/domain/email.entity"
import type {
  EmailsRepositoryPort,
  EmailUserDirectoryPort,
} from "@/src/emails/domain/email.repository"
import {
  emailRecipientDisplayName,
  emailRecipientFirstName,
} from "./email-recipient-name"
import { welcomeSubject } from "./render-email.usecase"

export async function queueManualEmailUseCase(
  input: QueueManualEmailInput & { adminId: string },
  deps: {
    directory: EmailUserDirectoryPort
    emailsRepo: EmailsRepositoryPort
  },
): Promise<{ batchId: string }> {
  const resolved = await deps.directory.resolve([input.userId])
  const recipient = resolved[0]
  if (!recipient) {
    throw new Error("Recipient not found")
  }

  const firstName = emailRecipientFirstName(recipient)
  const nameTo = emailRecipientDisplayName(recipient)
  const customMessage = input.customMessage.trim()
  const site = getSiteUrl()
  const templateProps = {
    name: firstName,
    customMessage,
    profileHref: `${site}/es/settings`,
    mapHref: `${site}/es/map`,
    unsubscribeUrl: null,
  }
  const subject = input.subject?.trim() || welcomeSubject(firstName)

  const batchId = await deps.emailsRepo.queueBatch({
    emailType: "welcome",
    subject,
    customMessage,
    templateProps,
    createdBy: input.adminId,
    source: "manual",
    dryRun: Boolean(input.dryRun),
    allowDuplicate: Boolean(input.ignoreAlreadySent),
    recipients: [
      {
        userId: recipient.id,
        emailTo: recipient.email,
        nameTo,
      },
    ],
  })

  return { batchId }
}
