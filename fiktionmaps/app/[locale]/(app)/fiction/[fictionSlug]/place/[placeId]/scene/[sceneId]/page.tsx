import { notFound, redirect } from "next/navigation"
import { isUuidString } from "@/lib/validation/primitives"
import { getFictionByIdCached, getFictionBySlugCached } from "@/src/fictions/infrastructure/next/fiction.queries"

type Props = {
  params: Promise<{ locale: string; fictionSlug: string; placeId: string; sceneId: string }>
}

/** Legacy nested URL; canonical scene route omits `placeId`. */
export default async function FictionSceneLegacyFromPlacePage({ params }: Props) {
  const { locale, fictionSlug, sceneId } = await params
  const fiction = isUuidString(fictionSlug)
    ? await getFictionByIdCached(fictionSlug)
    : await getFictionBySlugCached(fictionSlug)
  if (!fiction?.active) notFound()
  const segment = encodeURIComponent(fiction.slug ?? fiction.id)
  redirect(`/${locale}/fiction/${segment}/scene/${encodeURIComponent(sceneId)}`)
}
