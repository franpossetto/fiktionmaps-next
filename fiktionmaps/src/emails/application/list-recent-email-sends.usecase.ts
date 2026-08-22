import type { EmailSendWithBatch } from "@/src/emails/domain/email.entity"
import type { EmailsRepositoryPort } from "@/src/emails/domain/email.repository"

export async function listRecentEmailSendsUseCase(
  limit: number,
  repo: EmailsRepositoryPort,
): Promise<EmailSendWithBatch[]> {
  return repo.listRecentSends(Math.min(Math.max(limit, 1), 50))
}
