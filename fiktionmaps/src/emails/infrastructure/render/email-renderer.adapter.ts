import { render } from "@react-email/render"
import {
  NewContentEmail,
  type NewContentEmailProps,
} from "@/lib/email/templates/new-content-email"
import { WelcomeEmail } from "@/lib/email/templates/welcome-email"
import type { EmailRendererPort, RenderEmailInput } from "@/src/emails/domain/email.repository"

export const emailRendererAdapter: EmailRendererPort = {
  async render(input: RenderEmailInput) {
    if (input.emailType !== "welcome") {
      throw new Error(`Unsupported email type: ${input.emailType}`)
    }

    const element = WelcomeEmail({
      name: input.props.name,
      profileHref: input.props.profileHref,
      mapHref: input.props.mapHref,
      unsubscribeUrl: input.props.unsubscribeUrl ?? null,
    })

    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ])

    return { html, text }
  },
}

/** Preview-only until new_content is wired into queue/dispatch. */
export async function renderNewContentEmail(
  props: NewContentEmailProps,
): Promise<{ html: string; text: string }> {
  const element = NewContentEmail(props)
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])
  return { html, text }
}
