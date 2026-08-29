import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { FictionPhotoContributeWizard } from "@/components/contribute/photo/fiction-photo-contribute-wizard"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"

type Props = { params: Promise<{ locale: string }> }

export default async function ContributeFictionHeroPhotoPage({ params }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  const fictions = await getActiveFictionsCached()

  return <FictionPhotoContributeWizard target="hero" initialFictions={fictions} />
}
