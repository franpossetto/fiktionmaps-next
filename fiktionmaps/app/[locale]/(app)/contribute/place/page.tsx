import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { PlaceContributeWizard } from "@/components/contribute/place/place-contribute-wizard"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"

type Props = { params: Promise<{ locale: string }> }

export default async function ContributePlacePage({ params }: Props) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  await params

  const [fictions, cities] = await Promise.all([getActiveFictionsCached(), getAllCitiesCached()])

  return <PlaceContributeWizard initialFictions={fictions} initialCities={cities} />
}
