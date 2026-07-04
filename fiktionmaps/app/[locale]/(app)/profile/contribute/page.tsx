import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { ProfileContributeHub } from "@/components/profile/profile-contribute-hub"
import { getTopContributorsCached } from "@/src/contributions/infrastructure/next/contribution.queries"
import { getIsUserContributor } from "@/src/users/infrastructure/next/user.queries"
import { isAIAvailable } from "@/lib/ai/get-llm-provider"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contribute.hub")
  return { title: t("metaTitle") }
}

export default async function ProfileContributePage() {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  const [topContributors, isContributor] = await Promise.all([
    getTopContributorsCached(14),
    getIsUserContributor(userId),
  ])

  return <ProfileContributeHub topContributors={topContributors} isContributor={isContributor} isAIAvailable={isAIAvailable()} />
}
