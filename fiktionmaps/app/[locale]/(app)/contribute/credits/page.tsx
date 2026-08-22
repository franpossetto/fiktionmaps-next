import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { CreditsContributeWizard } from "@/components/contribute/credits/credits-contribute-wizard"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"

type Props = { params: Promise<{ locale: string }> }

export default async function ContributeCreditsPage({ params }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  const fictions = await getActiveFictionsCached()

  return <CreditsContributeWizard initialFictions={fictions} />
}
