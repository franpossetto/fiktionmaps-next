import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { RedirectType } from "next/dist/client/components/redirect"
import { getTranslations } from "next-intl/server"
import { getFictionByIdCached, getFictionBySlugCached, getFictionCitiesCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getPlaceLocationByIdDetailCached } from "@/src/places/infrastructure/next/place.queries"
import { getScenesForPlace } from "@/src/scenes/infrastructure/next/scene.queries"
import { isUuidString } from "@/lib/validation/primitives"
import { getSiteUrl } from "@/lib/site"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import { FictionPlaceDetailView } from "@/components/fictions/fiction-place-detail-view"
import { FictionSlugDetailShell } from "@/components/fictions/fiction-slug-detail-shell"
import { getFictionSidebarSummaryText } from "@/lib/fictions/get-fiction-sidebar-summary-text"

type Props = {
  params: Promise<{ locale: string; slug: string; placeId: string }>
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

function redirectLegacyUuidSlugIfNeeded(slug: string, locale: string, placeId: string, fiction: FictionWithMedia) {
  if (isUuidString(slug) && fiction.slug) {
    redirect(`/${locale}/fictions/${fiction.slug}/places/${placeId}`, RedirectType.replace)
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, placeId, locale } = await params
  const siteUrl = getSiteUrl()
  const fiction = await loadActiveFiction(slug)
  const location = fiction ? await getPlaceLocationByIdDetailCached(placeId) : null
  const tMeta = await getTranslations({ locale, namespace: "Metadata" })
  if (!fiction || !fiction.active || !location || location.fictionId !== fiction.id) {
    return {
      title: tMeta("placeNotFound"),
      robots: { index: false, follow: false },
    }
  }
  const effectiveSlug = fiction.slug?.trim() || slug
  const canonicalPath = `/${locale}/fictions/${effectiveSlug}/places/${placeId}`
  const canonicalUrl = `${siteUrl}${canonicalPath}`
  const title = tMeta("placeDetailTitle", { placeName: location.name, fictionTitle: fiction.title })
  const description =
    location.description?.slice(0, 160) || tMeta("fictionDetailDescriptionFilm", { title: fiction.title })
  const image = location.image?.trim() || fiction.coverImage?.trim() || fiction.bannerImage?.trim()
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/en/fictions/${effectiveSlug}/places/${placeId}`,
        es: `${siteUrl}/es/fictions/${effectiveSlug}/places/${placeId}`,
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      locale: mapLocaleToOpenGraph(locale),
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: location.name }] }),
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
  const { slug, placeId, locale } = await params
  const fiction = await loadActiveFiction(slug)
  if (!fiction) notFound()
  redirectLegacyUuidSlugIfNeeded(slug, locale, placeId, fiction)

  const location = await getPlaceLocationByIdDetailCached(placeId)
  if (!location || location.id !== placeId || location.fictionId !== fiction.id) notFound()

  const [initialCities, scenes, sidebarSummary] = await Promise.all([
    getFictionCitiesCached(fiction.id),
    getScenesForPlace(placeId),
    getFictionSidebarSummaryText(fiction, locale),
  ])

  const cityById = new Map(initialCities.map((c) => [c.id, c]))
  const city = cityById.get(location.cityId)
  const canonicalSlug = fiction.slug?.trim() || slug
  const baseMapParams = new URLSearchParams({
    fiction: fiction.id,
    place: placeId,
  })
  if (city) baseMapParams.set("city", city.id)
  const exploreMapHref = `/map?${baseMapParams.toString()}`

  return (
    <FictionSlugDetailShell fiction={fiction} summaryText={sidebarSummary}>
      <FictionPlaceDetailView
        fiction={fiction}
        fictionPathSlug={canonicalSlug}
        location={location}
        city={city}
        scenes={scenes}
        exploreMapHref={exploreMapHref}
      />
    </FictionSlugDetailShell>
  )
}
