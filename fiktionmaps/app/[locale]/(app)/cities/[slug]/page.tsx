import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  cityHasPublicPlacesCached,
  getCityBySlugCached,
  getCityFictionsCached,
} from "@/src/cities/infrastructure/next/city.queries"
import { getPlaceCountsByFictionIdsCached } from "@/src/places/infrastructure/next/place.queries"
import { getFictionContributorsCached } from "@/src/contributions/infrastructure/next/contribution.queries"
import { mergeFictionContributorRankedProfiles } from "@/src/contributions/application/get-fiction-contributors.usecase"
import { getSiteUrl } from "@/lib/site"
import { CityDetail } from "@/components/cities/city-detail"
import { CityDetailRightRail } from "@/components/cities/city-detail-right-rail"

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

function mapLocaleToOpenGraph(locale: string): string {
  if (locale === "en") return "en_US"
  if (locale === "es") return "es_ES"
  return locale
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const siteUrl = getSiteUrl()
  const city = await getCityBySlugCached(slug)
  const tMeta = await getTranslations({ locale, namespace: "Metadata" })

  if (!city) {
    return {
      title: tMeta("cityNotFound"),
      robots: { index: false, follow: false },
    }
  }

  const hasPublicPlaces = await cityHasPublicPlacesCached(city.id)
  const title = tMeta("cityDetailTitle", { city: city.name })
  const description = tMeta("cityDetailDescription", { city: city.name })
  const canonical = `${siteUrl}/${locale}/cities/${city.slug}`

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}/en/cities/${city.slug}`,
        es: `${siteUrl}/es/cities/${city.slug}`,
      },
    },
    robots: hasPublicPlaces
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: mapLocaleToOpenGraph(locale),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function CityDetailPage({ params }: Props) {
  const { slug } = await params
  const city = await getCityBySlugCached(slug)
  if (!city) notFound()

  const fictions = await getCityFictionsCached(city.id)
  const activeFictions = fictions.filter((f) => f.active)
  const fictionIds = activeFictions.map((f) => f.id)

  const [placeCounts, contributorsPerFiction] = await Promise.all([
    fictionIds.length > 0 ? getPlaceCountsByFictionIdsCached(fictionIds) : Promise.resolve({}),
    Promise.all(fictionIds.map((id) => getFictionContributorsCached(id))),
  ])

  const totalPlaces = (Object.values(placeCounts) as number[]).reduce((sum, n) => sum + n, 0)

  const contributors = mergeFictionContributorRankedProfiles(contributorsPerFiction)

  const exploreMapHref = `/map?city=${encodeURIComponent(city.slug)}`

  return (
    <CityDetail
      city={city}
      fictions={activeFictions}
      placeCounts={placeCounts}
      exploreMapHref={exploreMapHref}
      rightAside={
        <CityDetailRightRail
          fictionCount={activeFictions.length}
          placeCount={totalPlaces}
          contributors={contributors}
        />
      }
    />
  )
}
