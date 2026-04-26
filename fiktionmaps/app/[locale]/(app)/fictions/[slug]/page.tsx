import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { RedirectType } from "next/dist/client/components/redirect"
import {
  getFictionByIdCached,
  getFictionBySlugCached,
  getFictionCitiesCached,
  getSameCityMovieRecommendationsCached,
} from "@/src/fictions/infrastructure/next/fiction.queries"
import {
  getFictionLocationsCached,
  getPlaceCountsByFictionIdsCached,
} from "@/src/places/infrastructure/next/place.queries"
import { isUuidString } from "@/lib/validation/primitives"
import { getSiteUrl } from "@/lib/site"
import { FictionDetailPageClient } from "./fiction-detail-page-client"

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

async function resolveFiction(slug: string, locale: string) {
  // Legacy UUID URLs: redirect permanently to slug URL
  if (isUuidString(slug)) {
    const fiction = await getFictionByIdCached(slug)
    if (!fiction || !fiction.active) return null
    if (fiction.slug) {
      redirect(`/${locale}/fictions/${fiction.slug}`, RedirectType.replace)
    }
    return fiction
  }
  return getFictionBySlugCached(slug)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const siteUrl = getSiteUrl()
  const fiction = await resolveFiction(slug, locale)
  if (!fiction || !fiction.active) {
    return {
      title: "Fiction not found",
      robots: {
        index: false,
        follow: false,
      },
    }
  }
  const isBook = fiction.type === "book"
  const locationLabel = isBook ? "Real-World Locations" : "Filming Locations"
  const title = isBook
    ? `Where Was ${fiction.title} Set?`
    : `Where Was ${fiction.title} Filmed?`
  const description =
    fiction.description?.slice(0, 160) ||
    `Discover ${fiction.title} ${locationLabel.toLowerCase()}, explore them on the map, and plan your visit with practical travel tips.`
  const image = fiction.coverImage?.trim() || fiction.bannerImage?.trim()
  const effectiveSlug = fiction.slug?.trim() || slug
  const canonicalPath = `/${locale}/fictions/${effectiveSlug}`
  const canonicalUrl = `${siteUrl}${canonicalPath}`
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/en/fictions/${effectiveSlug}`,
        es: `${siteUrl}/es/fictions/${effectiveSlug}`,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      locale,
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: fiction.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  }
}

export default async function FictionSlugPage({ params }: Props) {
  const { slug, locale } = await params
  const fiction = await resolveFiction(slug, locale)
  if (!fiction || !fiction.active) {
    notFound()
  }
  const [initialLocations, initialCities, sameCityRecommendations] = await Promise.all([
    getFictionLocationsCached(fiction.id),
    getFictionCitiesCached(fiction.id),
    getSameCityMovieRecommendationsCached(fiction.id),
  ])
  const recommendationIds = sameCityRecommendations.map((f) => f.id)
  const sameCityRecommendationPlaceCounts =
    recommendationIds.length > 0
      ? await getPlaceCountsByFictionIdsCached(recommendationIds)
      : {}
  return (
    <FictionDetailPageClient
      fiction={fiction}
      initialLocations={initialLocations}
      initialCities={initialCities}
      sameCityRecommendations={sameCityRecommendations}
      sameCityRecommendationPlaceCounts={sameCityRecommendationPlaceCounts}
    />
  )
}
