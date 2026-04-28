import { redirect } from "next/navigation"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import { isUuidString } from "@/lib/validation/primitives"
import { getFictionByIdCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { FictionPlaceClient } from "./fiction-place-client"

type Props = {
  params: Promise<{ locale: string; fictionSlug: string; placeId: string }>
}

export default async function FictionPlacePage({ params }: Props) {
  const { locale, fictionSlug, placeId } = await params
  if (isUuidString(fictionSlug)) {
    const fiction = await getFictionByIdCached(fictionSlug)
    if (fiction?.active && fiction.slug) {
      redirect(
        `/${locale}/fiction/${encodeURIComponent(fiction.slug)}/place/${encodeURIComponent(placeId)}`,
      )
    }
  }
  return (
    <AppDetailRailsShell>
      <FictionPlaceClient />
    </AppDetailRailsShell>
  )
}
