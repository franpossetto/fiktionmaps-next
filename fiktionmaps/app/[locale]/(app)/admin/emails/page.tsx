import { EmailsList } from "@/components/admin/emails-list"
import { listRecentEmailSendsQuery } from "@/src/emails/infrastructure/next/email.queries"

export default async function AdminEmailsPage() {
  const recent = await listRecentEmailSendsQuery(20)
  const initialSends = recent.success ? recent.sends : []

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <EmailsList initialSends={initialSends} />
    </div>
  )
}
