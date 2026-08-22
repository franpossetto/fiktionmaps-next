import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  getFictionBySlugCached,
  getFictionInterestsCached,
} from "@/src/fictions/infrastructure/next/fiction.queries"
import { getInterestCatalogCached } from "@/src/interests/infrastructure/next/interest.queries"
import { getFictionLikeCountsCached } from "@/src/fiction-likes/infrastructure/next/fiction-likes.queries"
import { getFictionPlacesCached } from "@/src/places/infrastructure/next/place.queries"
import { getCompositeGroupsForFictionPlacesCached } from "@/src/place-relationships/infrastructure/next/place-relationship.queries"
import { getAllCitiesCached } from "@/src/cities/infrastructure/next/city.queries"
import { getFictionContributorsCached } from "@/src/contributions/infrastructure/next/contribution.queries"
import { getFictionPersonsCached } from "@/src/persons/infrastructure/next/person.queries"
import { getCurrentUserHasLikedFiction } from "@/src/users/infrastructure/next/user.queries"
import { getSiteUrl } from "@/lib/site"
import { FictionDetail } from "@/components/fictions/fiction-detail"
import {
  FictionDetailRecommendations,
  FictionDetailRecommendationsFallback,
} from "@/components/fictions/fiction-detail-recommendations"
import { FictionDetailRightRail } from "@/components/fictions/fiction-detail-right-rail"
import { FictionSlugDetailShell } from "@/components/fictions/fiction-slug-detail-shell"
import { getFictionSidebarSummaryText } from "@/lib/fictions/get-fiction-sidebar-summary-text"
import { orderCitiesForFictionDetail } from "@/lib/fictions/order-cities-for-fiction-detail"

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

function mapLocaleToOpenGraph(locale: string): string {
  if (locale === "en") return "en_US"
  if (locale === "es") return "es_ES"
  return locale
}

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

async function resolveFiction(slug: string) {
  const fiction = await getFictionBySlugCached(slug.trim())
  if (!fiction?.active) return null
  return fiction
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const siteUrl = getSiteUrl()
  const fiction = await resolveFiction(slug)
  const tMeta = await getTranslations({ locale, namespace: "Metadata" })
  if (!fiction || !fiction.active) {
    return {
      title: tMeta("fictionNotFound"),
      robots: {
        index: false,
        follow: false,
      },
    }
  }
  const isBook = fiction.type === "book"
  const title = isBook
    ? tMeta("fictionDetailTitleBook", { title: fiction.title })
    : tMeta("fictionDetailTitleFilm", { title: fiction.title })
  const fallbackDescription = isBook
    ? tMeta("fictionDetailDescriptionBook", { title: fiction.title })
    : tMeta("fictionDetailDescriptionFilm", { title: fiction.title })
  const description = fiction.description?.slice(0, 160) || fallbackDescription
  const image = fiction.coverImage?.trim() || fiction.bannerImage?.trim()
  const canonicalSlug = fiction.slug.trim()
  const canonicalPath = `/${locale}/fictions/${canonicalSlug}`
  const canonicalUrl = `${siteUrl}${canonicalPath}`
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${siteUrl}/en/fictions/${canonicalSlug}`,
        es: `${siteUrl}/es/fictions/${canonicalSlug}`,
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
      locale: mapLocaleToOpenGraph(locale),
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
  const siteUrl = getSiteUrl()
  const fiction = await resolveFiction(slug)
  if (!fiction || !fiction.active) {
    notFound()
  }
  const canonicalSlug = fiction.slug.trim()
  const canonicalUrl = `${siteUrl}/${locale}/fictions/${canonicalSlug}`
  const tMeta = await getTranslations({ locale, namespace: "Metadata" })

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: tMeta("breadcrumbHome"),
        item: `${siteUrl}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: tMeta("breadcrumbFictions"),
        item: `${siteUrl}/${locale}/fictions`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: fiction.title,
        item: canonicalUrl,
      },
    ],
  }

  const creativeWorkSchema = {
    "@context": "https://schema.org",
    "@type": fiction.type === "book" ? "Book" : "Movie",
    name: fiction.title,
    description: fiction.description || undefined,
    url: canonicalUrl,
    image: fiction.coverImage || fiction.bannerImage || undefined,
    ...(fiction.original_language ? { inLanguage: fiction.original_language } : {}),
  }

  const [
    initialPlaces,
    allCities,
    likeCounts,
    fictionInterestIds,
    interestCatalog,
    fictionContributors,
    fictionCredits,
    sidebarSummary,
    initialLiked,
  ] = await Promise.all([
    getFictionPlacesCached(fiction.id),
    getAllCitiesCached(),
    getFictionLikeCountsCached([fiction.id]),
    getFictionInterestsCached(fiction.id),
    getInterestCatalogCached(locale),
    getFictionContributorsCached(fiction.id),
    getFictionPersonsCached(fiction.id),
    getFictionSidebarSummaryText(fiction, locale),
    getCurrentUserHasLikedFiction(fiction.id),
  ])

  const compositeGroups = await getCompositeGroupsForFictionPlacesCached(
    fiction.id,
    initialPlaces.map((p) => p.id),
  )

  const labelByInterestId = new Map(interestCatalog.map((i) => [i.id, i.label]))
  const fictionInterestTags = fictionInterestIds.flatMap((id) => {
    const label = labelByInterestId.get(id)
    return label != null ? [{ id, label }] : []
  })
  const initialLikeCount = likeCounts[fiction.id] ?? 0

  const cityIdsFromPlaces = new Set(
    initialPlaces.map((p) => p.location.cityId).filter(Boolean),
  )
  const citiesForFiction = allCities.filter((c) => cityIdsFromPlaces.has(c.id))
  const fictionCitiesOrdered = orderCitiesForFictionDetail(initialPlaces, citiesForFiction)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(creativeWorkSchema) }}
      />
      <FictionSlugDetailShell
        fiction={fiction}
        summaryText={sidebarSummary}
        rightAside={
          <FictionDetailRightRail
            fictionId={fiction.id}
            fictionTitle={fiction.title}
            fictionInterestTags={fictionInterestTags}
            contributors={fictionContributors}
            initialCities={fictionCitiesOrdered}
          />
        }
      >
        <FictionDetail
          fiction={fiction}
          initialPlaces={initialPlaces}
          initialCities={fictionCitiesOrdered}
          compositeGroups={compositeGroups}
          initialLikeCount={initialLikeCount}
          initialLiked={initialLiked}
          fictionInterestTags={fictionInterestTags}
          credits={fictionCredits}
          recommendationsSlot={
            <Suspense fallback={<FictionDetailRecommendationsFallback />}>
              <FictionDetailRecommendations
                fictionId={fiction.id}
                interestIds={fictionInterestIds}
                places={initialPlaces}
              />
            </Suspense>
          }
        />
      </FictionSlugDetailShell>
    </>
  )
}
