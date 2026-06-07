import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { PlacePhotoContributeWizard } from "@/components/contribute/photo/place-photo-contribute-wizard"
import { getActiveFictionsWithApprovedPlacesCached } from "@/src/fictions/infrastructure/next/fiction.queries"

type Props = { params: Promise<{ locale: string }> }

export default async function ContributePlacePhotoPage({ params }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  const fictions = await getActiveFictionsWithApprovedPlacesCached()

  return <PlacePhotoContributeWizard initialFictions={fictions} />
}
