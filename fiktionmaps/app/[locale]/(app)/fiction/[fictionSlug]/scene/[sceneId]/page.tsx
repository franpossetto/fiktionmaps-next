import { redirect } from "next/navigation"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import { isUuidString } from "@/lib/validation/primitives"
import { getFictionByIdCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { FictionSceneClient } from "./fiction-scene-client"

type Props = {
  params: Promise<{ locale: string; fictionSlug: string; sceneId: string }>
}

export default async function FictionScenePage({ params }: Props) {
  const { locale, fictionSlug, sceneId } = await params
  if (isUuidString(fictionSlug)) {
    const fiction = await getFictionByIdCached(fictionSlug)
    if (fiction?.active && fiction.slug) {
      redirect(`/${locale}/fiction/${encodeURIComponent(fiction.slug)}/scene/${encodeURIComponent(sceneId)}`)
    }
  }
  return (
    <AppDetailRailsShell>
      <FictionSceneClient />
    </AppDetailRailsShell>
  )
}
