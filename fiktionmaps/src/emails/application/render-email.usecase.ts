import type { EmailType, RenderedEmail, WelcomeTemplateProps } from "@/src/emails/domain/email.entity"
import type { EmailRendererPort } from "@/src/emails/domain/email.repository"

export function welcomeSubject(name: string): string {
  return `¡Bienvenido a FiktionMaps, ${name}!`
}

export async function renderEmailUseCase(
  input: {
    emailType: EmailType
    props: WelcomeTemplateProps
    subject: string
  },
  renderer: EmailRendererPort,
): Promise<RenderedEmail> {
  const { html, text } = await renderer.render(input)
  return {
    subject: input.subject,
    html,
    text,
  }
}
