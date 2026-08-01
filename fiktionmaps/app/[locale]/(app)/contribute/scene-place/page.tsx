import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { ScenePlaceContributeWizard } from "@/components/contribute/scene-place/scene-place-contribute-wizard"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"

type Props = { params: Promise<{ locale: string }> }

export default async function ContributeScenePlacePage({ params }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  const fictions = await getActiveFictionsCached()
  const audiovisualFictions = fictions.filter((f) => f.type === "movie" || f.type === "tv-series")

  return <ScenePlaceContributeWizard initialFictions={audiovisualFictions} />
}
