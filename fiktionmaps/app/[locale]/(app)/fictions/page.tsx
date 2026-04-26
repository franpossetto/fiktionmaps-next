import type { Metadata } from "next"
import { getAllFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getSceneCountsByFictionIdsCached } from "@/src/scenes/infrastructure/next/scene.queries"
import { getFictionLikeCountsCached } from "@/src/fiction-likes/infrastructure/next/fiction-likes.queries"
import { getPlaceCountsByFictionIdsCached } from "@/src/places/infrastructure/next/place.queries"
import { FictionLanding } from "@/components/fictions/fiction-landing"
import { getSiteUrl } from "@/lib/site"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/${locale}/fictions`
  return {
    title: "Explore Movies & Books by Location",
    description:
      "Browse active fiction titles and discover where stories happened in real life through maps, scenes, and places.",
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}/en/fictions`,
        es: `${siteUrl}/es/fictions`,
      },
    },
    openGraph: {
      title: "Explore Movies & Books by Location",
      description:
        "Browse active fiction titles and discover where stories happened in real life through maps, scenes, and places.",
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Explore Movies & Books by Location",
      description:
        "Browse active fiction titles and discover where stories happened in real life through maps, scenes, and places.",
    },
  }
}

export default async function FictionsPage() {
  const all = await getAllFictionsCached()
  const fictions = all.filter((f) => f.active)
  const allIds = fictions.map((f) => f.id)

  const [sceneCounts, likeCounts, placeCounts] = await Promise.all([
    getSceneCountsByFictionIdsCached(allIds),
    getFictionLikeCountsCached(allIds),
    getPlaceCountsByFictionIdsCached(allIds),
  ])

  return (
    <div className="h-full">
      <FictionLanding
        initialFictions={fictions}
        initialSceneCounts={sceneCounts}
        initialLikeCounts={likeCounts}
        initialPlaceCounts={placeCounts}
      />
    </div>
  )
}
