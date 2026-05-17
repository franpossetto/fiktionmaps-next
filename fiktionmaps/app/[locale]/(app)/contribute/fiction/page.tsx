import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { FictionContributeWizard } from "@/components/contribute/fiction/fiction-contribute-wizard"
import { getInterestCatalogCached } from "@/src/interests/infrastructure/next/interest.queries"

type Props = { params: Promise<{ locale: string }> }

export default async function ContributeFictionPage({ params }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  const { locale } = await params
  const interests = await getInterestCatalogCached(locale)

  return <FictionContributeWizard initialInterests={interests} />
}
