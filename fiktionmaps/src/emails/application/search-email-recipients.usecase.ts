import type { EmailRecipient, EmailRecipientFilter } from "@/src/emails/domain/email.entity"
import type { EmailUserDirectoryPort } from "@/src/emails/domain/email.repository"

export async function searchEmailRecipientsUseCase(
  query: string,
  filter: EmailRecipientFilter,
  directory: EmailUserDirectoryPort,
): Promise<EmailRecipient[]> {
  return directory.search(query, filter)
}
