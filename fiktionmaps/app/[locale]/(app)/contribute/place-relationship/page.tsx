import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { PlaceRelationshipContributeWizard } from "@/components/contribute/place-relationship/place-relationship-contribute-wizard"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { resolvePlaceContributePrefill } from "@/lib/contribute/resolve-place-contribute-prefill"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ fictionId?: string; placeId?: string }>
}

export default async function ContributePlaceRelationshipPage({ params, searchParams }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  const fictions = await getActiveFictionsCached()
  const prefill = await resolvePlaceContributePrefill(await searchParams, fictions)

  return (
    <PlaceRelationshipContributeWizard
      initialFictions={fictions}
      prefill={prefill ? { fictionId: prefill.fictionId, placeId: prefill.place.id } : null}
    />
  )
}
