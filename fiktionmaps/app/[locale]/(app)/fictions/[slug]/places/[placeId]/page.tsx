import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getFictionBySlugCached, getFictionCitiesCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { resolvePlaceForFictionPathCached } from "@/src/places/infrastructure/next/place.queries"
import { getScenesForPlace } from "@/src/scenes/infrastructure/next/scene.queries"
import { getSiteUrl } from "@/lib/site"
import { FictionPlaceDetailView } from "@/components/fictions/fiction-place-detail-view"
import { FictionSlugDetailShell } from "@/components/fictions/fiction-slug-detail-shell"
import { getPlaceContributorsWithDatesCached } from "@/src/contributions/infrastructure/next/contribution.queries"
import { getFictionSidebarSummaryText } from "@/lib/fictions/get-fiction-sidebar-summary-text"

type Props = {
  params: Promise<{ locale: string; slug: string; placeId: string }>
}

function mapLocaleToOpenGraph(locale: string): string {
  if (locale === "en") return "en_US"
  if (locale === "es") return "es_ES"
  return locale
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, placeId: placeSegment, locale } = await params
  const siteUrl = getSiteUrl()
  const fiction = await getFictionBySlugCached(slug.trim())
  const place =
    fiction?.active ? await resolvePlaceForFictionPathCached(fiction.id, placeSegment) : null
  const tMeta = await getTranslations({ locale, namespace: "Metadata" })
  if (!fiction || !fiction.active || !place || place.fictionId !== fiction.id) {
    return {
      title: tMeta("placeNotFound"),
      robots: { index: false, follow: false },
    }
  }
  const fictionSlug = fiction.slug.trim()
  const placeSlug = place.slug.trim()
  const canonicalPath = `/${locale}/fictions/${fictionSlug}/places/${placeSlug}`
  const canonicalUrl = `${siteUrl}${canonicalPath}`
  const displayName = place.name.trim() || tMeta("unnamedPlace")
  const title = tMeta("placeDetailTitle", { placeName: displayName, fictionTitle: fiction.title })
  const description =
    place.description?.slice(0, 160) || tMeta("fictionDetailDescriptionFilm", { title: fiction.title })
  const image = place.image?.trim() || fiction.coverImage?.trim() || fiction.bannerImage?.trim()
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/en/fictions/${fictionSlug}/places/${placeSlug}`,
        es: `${siteUrl}/es/fictions/${fictionSlug}/places/${placeSlug}`,
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      locale: mapLocaleToOpenGraph(locale),
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: displayName }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  }
}

export default async function FictionPlaceUnderSlugPage({ params }: Props) {
  const { slug, placeId: placeSegment, locale } = await params
  const fiction = await getFictionBySlugCached(slug.trim())
  if (!fiction?.active) notFound()

  const place = await resolvePlaceForFictionPathCached(fiction.id, placeSegment)
  if (!place || place.fictionId !== fiction.id) notFound()

  const [initialCities, scenes, sidebarSummary, placeContributors] = await Promise.all([
    getFictionCitiesCached(fiction.id),
    getScenesForPlace(place.id),
    getFictionSidebarSummaryText(fiction, locale),
    getPlaceContributorsWithDatesCached(place.id),
  ])

  const cityById = new Map(initialCities.map((c) => [c.id, c]))
  const geo = place.location
  const city = geo?.cityId ? cityById.get(geo.cityId) : undefined
  const fictionSlug = fiction.slug.trim()
  const baseMapParams = new URLSearchParams({
    fiction: fiction.id,
    place: place.id,
  })
  if (city) baseMapParams.set("city", city.id)
  const exploreMapHref = `/map?${baseMapParams.toString()}`

  return (
    <FictionSlugDetailShell fiction={fiction} summaryText={sidebarSummary}>
      <FictionPlaceDetailView
        fiction={fiction}
        fictionPathSlug={fictionSlug}
        place={place}
        city={city}
        scenes={scenes}
        exploreMapHref={exploreMapHref}
        placeContributors={placeContributors}
      />
    </FictionSlugDetailShell>
  )
}
