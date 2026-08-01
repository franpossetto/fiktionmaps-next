import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getFictionBySlugCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getPlaceLocationsByIdsCached } from "@/src/places/infrastructure/next/place.queries"
import { getSceneByIdCached } from "@/src/scenes/infrastructure/next/scene.queries"
import { getSceneWatchBundleUseCase } from "@/src/scenes/application/get-scene-watch-bundle.usecase"
import { getSiteUrl } from "@/lib/site"
import { FictionSceneWatchClient } from "@/components/fictions/fiction-scene-watch-client"
import { FictionSlugDetailShell } from "@/components/fictions/fiction-slug-detail-shell"
import { SceneUpNextDeferred } from "@/components/scenes/scene-up-next-deferred"
import { getFictionSidebarSummaryText } from "@/lib/fictions/get-fiction-sidebar-summary-text"

type Props = {
  params: Promise<{ locale: string; slug: string; sceneId: string }>
}

function mapLocaleToOpenGraph(locale: string): string {
  if (locale === "en") return "en_US"
  if (locale === "es") return "es_ES"
  return locale
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, sceneId, locale } = await params
  const siteUrl = getSiteUrl()
  const fiction = await getFictionBySlugCached(slug.trim())
  const scene = fiction ? await getSceneByIdCached(sceneId) : null
  const tMeta = await getTranslations({ locale, namespace: "Metadata" })
  if (!fiction?.active || !scene || scene.fictionId !== fiction.id) {
    return {
      title: tMeta("sceneNotFound"),
      robots: { index: false, follow: false },
    }
  }
  const fictionSlug = fiction.slug.trim()
  const canonicalPath = `/${locale}/fictions/${fictionSlug}/scenes/${sceneId}`
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
        en: `${siteUrl}/en/fictions/${fictionSlug}/scenes/${sceneId}`,
        es: `${siteUrl}/es/fictions/${fictionSlug}/scenes/${sceneId}`,
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

  const bundle = await getSceneWatchBundleUseCase(
    { fictionSlug: slug, sceneId },
    {
      getFictionBySlug: getFictionBySlugCached,
      getSceneById: getSceneByIdCached,
      getPlacesByIds: getPlaceLocationsByIdsCached,
    },
  )
  if (!bundle) notFound()

  const { fiction, scene, place, places } = bundle
  const cityId = place.location.cityId
  const canonicalSlug = fiction.slug.trim()
  const sidebarSummary = await getFictionSidebarSummaryText(fiction, locale)

  return (
    <FictionSlugDetailShell
      fiction={fiction}
      summaryText={sidebarSummary}
      rightAside={
        <SceneUpNextDeferred
          fictionId={fiction.id}
          fictionPathSlug={canonicalSlug}
          currentSceneId={sceneId}
          primaryPlaceId={bundle.place.id}
          cityId={cityId}
        />
      }
    >
      <FictionSceneWatchClient
        fiction={fiction}
        fictionPathSlug={canonicalSlug}
        currentWatchScene={scene}
        placeName={place.name}
        placeSlug={place.slug}
        places={places}
      />
    </FictionSlugDetailShell>
  )
}
