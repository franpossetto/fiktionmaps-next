import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { SceneContributeWizard } from "@/components/contribute/scene/scene-contribute-wizard"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"

type Props = { params: Promise<{ locale: string }> }

export default async function ContributeScenePage({ params }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  const fictions = await getActiveFictionsCached()
  const audiovisualFictions = fictions.filter((f) => f.type === "movie" || f.type === "tv-series")

  return <SceneContributeWizard initialFictions={audiovisualFictions} />
}
