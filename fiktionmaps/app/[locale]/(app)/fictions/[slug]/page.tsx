import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { RedirectType } from "next/dist/client/components/redirect"
import { getTranslations } from "next-intl/server"
import {
  getFictionByIdCached,
  getFictionBySlugCached,
  getFictionCitiesCached,
  getFictionDetailRecommendations,
  getFictionInterestsCached,
} from "@/src/fictions/infrastructure/next/fiction.queries"
import { getInterestCatalogCached } from "@/src/interests/infrastructure/next/interest.queries"
import { getFictionLikeCountsCached } from "@/src/fiction-likes/infrastructure/next/fiction-likes.queries"
import {
  getFictionPlacesCached,
  getPlaceCountsByFictionIdsCached,
} from "@/src/places/infrastructure/next/place.queries"
import { getFictionContributorsCached } from "@/src/contributions/infrastructure/next/contribution.queries"
import { getCurrentUserHasLikedFiction } from "@/src/users/infrastructure/next/user.queries"
import { isUuidString } from "@/lib/validation/primitives"
import { getSiteUrl } from "@/lib/site"
import { FictionDetail } from "@/components/fictions/fiction-detail"
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
  const fiction = await resolveFiction(slug, locale)
  if (!fiction || !fiction.active) {
    notFound()
  }
  const canonicalSlug = fiction.slug?.trim() || slug
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
    inLanguage: locale,
  }

  const [
    initialPlaces,
    initialCities,
    likeCounts,
    initialLiked,
    fictionInterestIds,
    interestCatalog,
    fictionContributors,
  ] = await Promise.all([
    getFictionPlacesCached(fiction.id),
    getFictionCitiesCached(fiction.id),
    getFictionLikeCountsCached([fiction.id]),
    getCurrentUserHasLikedFiction(fiction.id),
    getFictionInterestsCached(fiction.id),
    getInterestCatalogCached(locale),
    getFictionContributorsCached(fiction.id),
  ])
  const labelByInterestId = new Map(interestCatalog.map((i) => [i.id, i.label]))
  const fictionInterestTags = fictionInterestIds.flatMap((id) => {
    const label = labelByInterestId.get(id)
    return label != null ? [{ id, label }] : []
  })
  const initialLikeCount = likeCounts[fiction.id] ?? 0

  const { fictions: fictionRecommendations, reason: fictionRecommendationReason } =
    await getFictionDetailRecommendations({
      fictionId: fiction.id,
      interestIds: fictionInterestIds,
      places: initialPlaces,
    })
  const fictionRecommendationIds = fictionRecommendations.map((f) => f.id)
  const fictionRecommendationPlaceCounts =
    fictionRecommendationIds.length > 0
      ? await getPlaceCountsByFictionIdsCached(fictionRecommendationIds)
      : {}

  const fictionCitiesOrdered = orderCitiesForFictionDetail(initialPlaces, initialCities)
  const sidebarSummary = await getFictionSidebarSummaryText(fiction, locale)
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
          initialLikeCount={initialLikeCount}
          initialLiked={initialLiked}
          fictionInterestTags={fictionInterestTags}
          fictionRecommendations={fictionRecommendations}
          fictionRecommendationReason={fictionRecommendationReason}
          fictionRecommendationPlaceCounts={fictionRecommendationPlaceCounts}
        />
      </FictionSlugDetailShell>
    </>
  )
}
