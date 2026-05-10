import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { getAllFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getSceneCountsByFictionIdsCached } from "@/src/scenes/infrastructure/next/scene.queries"
import { getFictionLikeCountsCached } from "@/src/fiction-likes/infrastructure/next/fiction-likes.queries"
import { getPlaceCountsByFictionIdsCached } from "@/src/places/infrastructure/next/place.queries"
import { getTopContributorsCached } from "@/src/contributions/infrastructure/next/contribution.queries"
import { FictionLanding } from "@/components/fictions/fiction-landing"
import { RecentFictionsSidebar } from "@/components/fictions/recent-fictions-sidebar"
import { TopContributorsSidebar } from "@/components/fictions/top-contributors-sidebar"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import { getSiteUrl } from "@/lib/site"
import { Link } from "@/i18n/navigation"

type Props = {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ q?: string }>
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

export default async function FictionsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialSearch = resolvedSearchParams?.q?.trim() ?? ""
  const all = await getAllFictionsCached()
  const fictions = all.filter((f) => f.active)
  const allIds = fictions.map((f) => f.id)
  const t = await getTranslations({ locale, namespace: "Fictions" })

  const [sceneCounts, likeCounts, placeCounts, topContributors] = await Promise.all([
    getSceneCountsByFictionIdsCached(allIds),
    getFictionLikeCountsCached(allIds),
    getPlaceCountsByFictionIdsCached(allIds),
    getTopContributorsCached(20),
  ])

  return (
    <AppDetailRailsShell
      scrollMode="page"
      rightAside={
        <div className="sticky top-10 w-full max-w-[208px]">
          <RecentFictionsSidebar initialFictions={fictions} />

          <TopContributorsSidebar contributors={topContributors} />

          <section className="mt-4 rounded-md bg-muted/40 p-3">
            <h4 className="text-sm font-semibold text-foreground">{t("becomeContributor")}</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("contributorBody")}
            </p>
            <Link
              href="/map"
              className="mt-2 inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              {t("startContributing")}
            </Link>
          </section>
        </div>
      }
    >
      <FictionLanding
        initialFictions={fictions}
        initialSceneCounts={sceneCounts}
        initialLikeCounts={likeCounts}
        initialPlaceCounts={placeCounts}
        initialSearch={initialSearch}
      />
    </AppDetailRailsShell>
  )
}
