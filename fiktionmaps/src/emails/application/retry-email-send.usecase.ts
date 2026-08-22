import type {
  EmailRendererPort,
  EmailsRepositoryPort,
  EmailTransportPort,
} from "@/src/emails/domain/email.repository"
import {
  dispatchEmailBatchUseCase,
  type DispatchEmailBatchResult,
} from "./dispatch-email-batch.usecase"

const RETRYABLE = new Set(["queued", "failed"])

export async function retryEmailSendUseCase(
  sendId: string,
  deps: {
    emailsRepo: EmailsRepositoryPort
    renderer: EmailRendererPort
    transport: EmailTransportPort
  },
): Promise<DispatchEmailBatchResult> {
  const send = await deps.emailsRepo.getSendById(sendId)
  if (!send) {
    throw new Error("Email send not found")
  }
  if (!RETRYABLE.has(send.status)) {
    throw new Error("Only queued or failed sends can be resent")
  }

  // Reset so dispatch can run again after a partial failure.
  await deps.emailsRepo.markSendQueued(send.id)
  await deps.emailsRepo.markBatchQueued(send.batchId)

  return dispatchEmailBatchUseCase(send.batchId, deps)
}
