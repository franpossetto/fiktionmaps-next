import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { ScenePlaceContributeWizard } from "@/components/contribute/scene-place/scene-place-contribute-wizard"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { resolvePlaceContributePrefill } from "@/lib/contribute/resolve-place-contribute-prefill"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ fictionId?: string; placeId?: string }>
}

export default async function ContributeScenePlacePage({ params, searchParams }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  const fictions = await getActiveFictionsCached()
  const audiovisualFictions = fictions.filter((f) => f.type === "movie" || f.type === "tv-series")
  const prefill = await resolvePlaceContributePrefill(await searchParams, audiovisualFictions)

  return <ScenePlaceContributeWizard initialFictions={audiovisualFictions} prefill={prefill} />
}
