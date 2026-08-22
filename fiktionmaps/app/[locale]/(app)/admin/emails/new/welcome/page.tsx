import { EmailCompose } from "@/components/admin/email-compose"
import { listRecentEmailSendsQuery } from "@/src/emails/infrastructure/next/email.queries"
import type { EmailRecipient } from "@/src/emails/domain/email.entity"

function uniqueRecentRecipients(
  sends: { userId: string; emailTo: string; nameTo: string }[],
): EmailRecipient[] {
  const seen = new Set<string>()
  const out: EmailRecipient[] = []
  for (const send of sends) {
    if (seen.has(send.userId)) continue
    seen.add(send.userId)
    out.push({
      id: send.userId,
      email: send.emailTo,
      username: null,
      fullName: send.nameTo,
    })
    if (out.length >= 8) break
  }
  return out
}

export default async function AdminEmailsNewWelcomePage() {
  const recent = await listRecentEmailSendsQuery(20)
  const recentRecipients = recent.success ? uniqueRecentRecipients(recent.sends) : []

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <EmailCompose recentRecipients={recentRecipients} />
    </div>
  )
}
