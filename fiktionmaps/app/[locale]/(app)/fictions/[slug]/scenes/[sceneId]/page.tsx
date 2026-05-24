import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { RedirectType } from "next/dist/client/components/redirect"
import { getTranslations } from "next-intl/server"
import { getFictionByIdCached, getFictionBySlugCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getPlaceLocationByIdCached } from "@/src/places/infrastructure/next/place.queries"
import { getSceneByIdUncached, getScenesForFiction } from "@/src/scenes/infrastructure/next/scene.queries"
import { isUuidString } from "@/lib/validation/primitives"
import { getSiteUrl } from "@/lib/site"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import { FictionSceneWatchClient } from "@/components/fictions/fiction-scene-watch-client"
import { FictionSlugDetailShell } from "@/components/fictions/fiction-slug-detail-shell"
import { getFictionSidebarSummaryText } from "@/lib/fictions/get-fiction-sidebar-summary-text"

type Props = {
  params: Promise<{ locale: string; slug: string; sceneId: string }>
}

function mapLocaleToOpenGraph(locale: string): string {
  if (locale === "en") return "en_US"
  if (locale === "es") return "es_ES"
  return locale
}

async function loadActiveFiction(slug: string): Promise<FictionWithMedia | null> {
  if (isUuidString(slug)) {
    const fiction = await getFictionByIdCached(slug)
    return fiction?.active ? fiction : null
  }
  const fiction = await getFictionBySlugCached(slug)
  return fiction?.active ? fiction : null
}

function redirectLegacyUuidSlugIfNeeded(
  slug: string,
  locale: string,
  sceneId: string,
  fiction: FictionWithMedia,
) {
  if (isUuidString(slug) && fiction.slug) {
    redirect(`/${locale}/fictions/${fiction.slug}/scenes/${sceneId}`, RedirectType.replace)
  }
}

async function loadRelatedPlaces(fictionScenes: { placeId: string }[], primaryPlaceId: string): Promise<Place[]> {
  const placeIds = [...new Set([...fictionScenes.map((s) => s.placeId), primaryPlaceId])]
  const places = await Promise.all(placeIds.map((id) => getPlaceLocationByIdCached(id)))
  return places.filter((p): p is Place => p != null)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, sceneId, locale } = await params
  const siteUrl = getSiteUrl()
  const fiction = await loadActiveFiction(slug)
  const scene = fiction ? await getSceneByIdUncached(sceneId) : null
  const tMeta = await getTranslations({ locale, namespace: "Metadata" })
  if (!fiction || !fiction.active || !scene || scene.fictionId !== fiction.id) {
    return {
      title: tMeta("sceneNotFound"),
      robots: { index: false, follow: false },
    }
  }
  const effectiveSlug = fiction.slug?.trim() || slug
  const canonicalPath = `/${locale}/fictions/${effectiveSlug}/scenes/${sceneId}`
  const canonicalUrl = `${siteUrl}${canonicalPath}`
  const title = tMeta("sceneDetailTitle", { sceneTitle: scene.title, fictionTitle: fiction.title })
  const description =
    scene.description?.slice(0, 160) || tMeta("fictionDetailDescriptionFilm", { title: fiction.title })
  const image =
    scene.thumbnail?.trim() || fiction.coverImage?.trim() || fiction.bannerImage?.trim()
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/en/fictions/${effectiveSlug}/scenes/${sceneId}`,
        es: `${siteUrl}/es/fictions/${effectiveSlug}/scenes/${sceneId}`,
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      locale: mapLocaleToOpenGraph(locale),
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: scene.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  }
}

export default async function FictionSceneUnderSlugPage({ params }: Props) {
  const { slug, sceneId, locale } = await params
  const fiction = await loadActiveFiction(slug)
  if (!fiction) notFound()
  redirectLegacyUuidSlugIfNeeded(slug, locale, sceneId, fiction)

  const scene = await getSceneByIdUncached(sceneId)
  if (!scene || scene.fictionId !== fiction.id) notFound()

  const location = await getPlaceLocationByIdCached(scene.placeId)
  if (!location || location.fictionId !== fiction.id) notFound()

  const [fictionScenes, sidebarSummary] = await Promise.all([
    getScenesForFiction(fiction.id),
    getFictionSidebarSummaryText(fiction, locale),
  ])

  const relatedPlaces = await loadRelatedPlaces(fictionScenes, scene.placeId)
  const currentWatchScene = fictionScenes.find((s) => s.id === sceneId) ?? scene
  const canonicalSlug = fiction.slug?.trim() || slug

  return (
    <FictionSlugDetailShell fiction={fiction} summaryText={sidebarSummary}>
      <FictionSceneWatchClient
        fiction={fiction}
        fictionPathSlug={canonicalSlug}
        currentWatchScene={currentWatchScene}
        fictionScenes={fictionScenes}
        relatedPlaces={relatedPlaces}
      />
    </FictionSlugDetailShell>
  )
}
