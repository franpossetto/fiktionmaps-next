import type { EmailsRepositoryPort } from "@/src/emails/domain/email.repository"

const DELETABLE = new Set(["queued", "failed", "skipped"])

export async function deleteEmailSendUseCase(
  sendId: string,
  repo: EmailsRepositoryPort,
): Promise<void> {
  const send = await repo.getSendById(sendId)
  if (!send) {
    throw new Error("Email send not found")
  }
  if (!DELETABLE.has(send.status)) {
    throw new Error("Only queued, failed, or skipped sends can be deleted")
  }
  await repo.deleteBatch(send.batchId)
}
