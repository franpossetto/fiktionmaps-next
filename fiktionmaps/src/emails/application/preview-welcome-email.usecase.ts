import { getSiteUrl } from "@/lib/site"
import type {
  EmailRendererPort,
  EmailUserDirectoryPort,
} from "@/src/emails/domain/email.repository"
import { emailRecipientFirstName } from "./email-recipient-name"
import { renderEmailUseCase, welcomeSubject } from "./render-email.usecase"

export async function previewWelcomeEmailUseCase(
  input: { userId: string; customMessage: string; subject?: string },
  deps: {
    directory: EmailUserDirectoryPort
    renderer: EmailRendererPort
  },
): Promise<{ subject: string; html: string; text: string }> {
  const resolved = await deps.directory.resolve([input.userId])
  const recipient = resolved[0]
  if (!recipient) {
    throw new Error("Recipient not found")
  }

  const firstName = emailRecipientFirstName(recipient)
  const customMessage = input.customMessage.trim()
  const site = getSiteUrl()
  const props = {
    name: firstName,
    customMessage,
    profileHref: `${site}/es/settings`,
    mapHref: `${site}/es/map`,
    unsubscribeUrl: null as string | null,
  }
  const subject = input.subject?.trim() || welcomeSubject(firstName)
  return renderEmailUseCase({ emailType: "welcome", props, subject }, deps.renderer)
}
