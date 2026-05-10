import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { getAllFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getFictionLikeCountsCached } from "@/src/fiction-likes/infrastructure/next/fiction-likes.queries"
import { getPlaceCountsByFictionIdsCached } from "@/src/places/infrastructure/next/place.queries"
import { FictionCatalog } from "@/components/fictions/fiction-catalog"
import { getSiteUrl } from "@/lib/site"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/${locale}/fictions`
  const tMeta = await getTranslations({ locale, namespace: "Metadata" })
  const title = tMeta("fictionsListTitle")
  const description = tMeta("fictionsListDescription")
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}/en/fictions`,
        es: `${siteUrl}/es/fictions`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function FictionsPage() {
  const all = await getAllFictionsCached()
  const fictions = all.filter((f) => f.active)
  const allIds = fictions.map((f) => f.id)

  const [likeCounts, placeCounts] = await Promise.all([
    getFictionLikeCountsCached(allIds),
    getPlaceCountsByFictionIdsCached(allIds),
  ])

  return (
    <div className="h-full overflow-y-auto bg-background">
      <FictionCatalog
        initialFictions={fictions}
        initialLikeCounts={likeCounts}
        initialPlaceCounts={placeCounts}
      />
    </div>
  )
}
