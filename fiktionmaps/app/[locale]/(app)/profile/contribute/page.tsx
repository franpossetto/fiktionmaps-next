import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { ProfileContributeHub } from "@/components/profile/profile-contribute-hub"
import { getTopContributorsCached } from "@/src/contributions/infrastructure/next/contribution.queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contribute.hub")
  return { title: t("metaTitle") }
}

export default async function ProfileContributePage() {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  const topContributors = await getTopContributorsCached(14)

  return <ProfileContributeHub topContributors={topContributors} />
}
