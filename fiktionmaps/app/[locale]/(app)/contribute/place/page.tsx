import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { PlaceContributeWizard } from "@/components/contribute/place/place-contribute-wizard"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getHuntPlaceContributePrefillCached } from "@/src/hunts/infrastructure/next/hunt.queries"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ huntId?: string; placeIndex?: string }>
}

export default async function ContributePlacePage({ params, searchParams }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params
  const { huntId, placeIndex: placeIndexParam } = await searchParams

  const [fictions, cities] = await Promise.all([getActiveFictionsCached(), getAllCitiesCached()])

  let huntPrefill = null
  if (huntId && placeIndexParam != null) {
    const placeIndex = Number.parseInt(placeIndexParam, 10)
    if (Number.isFinite(placeIndex) && placeIndex >= 0) {
      huntPrefill = await getHuntPlaceContributePrefillCached(huntId, placeIndex)
    }
  }

  return (
    <PlaceContributeWizard
      initialFictions={fictions}
      initialCities={cities}
      huntPrefill={huntPrefill}
    />
  )
}
