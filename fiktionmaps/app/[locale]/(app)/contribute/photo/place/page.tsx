import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { PlacePhotoContributeWizard } from "@/components/contribute/photo/place-photo-contribute-wizard"
import { getActiveFictionsWithApprovedPlacesCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { resolvePlaceContributePrefill } from "@/lib/contribute/resolve-place-contribute-prefill"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ fictionId?: string; placeId?: string }>
}

export default async function ContributePlacePhotoPage({ params, searchParams }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  const fictions = await getActiveFictionsWithApprovedPlacesCached()
  const prefill = await resolvePlaceContributePrefill(await searchParams, fictions)

  return <PlacePhotoContributeWizard initialFictions={fictions} prefill={prefill} />
}
